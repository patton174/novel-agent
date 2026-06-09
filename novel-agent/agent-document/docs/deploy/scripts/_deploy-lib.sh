#!/usr/bin/env bash
# 部署脚本公共函数

# CI 可设 DEPLOY_SSH_OPTS="-i ~/.ssh/deploy_key -o StrictHostKeyChecking=yes"
deploy_ssh() {
  if [[ -n "${DEPLOY_SSH_OPTS:-}" ]]; then
    # shellcheck disable=SC2086
    ssh $DEPLOY_SSH_OPTS "$@"
  else
    ssh "$@"
  fi
}

deploy_scp() {
  if [[ -n "${DEPLOY_SCP_OPTS:-}" ]]; then
    # shellcheck disable=SC2086
    scp $DEPLOY_SCP_OPTS "$@"
  else
    scp "$@"
  fi
}

# CI 无 .env.split 时，从 MW .env.mw 读取 internal key
load_internal_service_key_from_mw() {
  if [[ -n "${AGENT_INTERNAL_SERVICE_KEY:-${INTERNAL_SERVICE_KEY:-}}" ]]; then
    export AGENT_INTERNAL_SERVICE_KEY="${AGENT_INTERNAL_SERVICE_KEY:-${INTERNAL_SERVICE_KEY:-}}"
    return 0
  fi
  : "${MW_HOST:?MW_HOST required to load AGENT_INTERNAL_SERVICE_KEY}"
  local mw_ssh="${MW_SSH:-root@${MW_HOST}}"
  local mw_env="${MW_REMOTE_DIR:-/opt/novel-agent}/novel-agent/agent-document/docs/deploy/docker/.env.mw"
  local key
  key=$(deploy_ssh "$mw_ssh" \
    "grep -E '^AGENT_INTERNAL_SERVICE_KEY=' '$mw_env' 2>/dev/null | head -1 | cut -d= -f2-" \
    2>/dev/null || true)
  if [[ -n "$key" ]]; then
    export AGENT_INTERNAL_SERVICE_KEY="$key"
    echo "[deploy] 已从 MW .env.mw 加载 AGENT_INTERNAL_SERVICE_KEY"
    return 0
  fi
  return 1
}

deploy_remote_has_rsync() {
  local remote_ssh="$1"
  deploy_ssh "$remote_ssh" "command -v rsync >/dev/null 2>&1" >/dev/null 2>&1
}

deploy_can_rsync() {
  local remote_ssh="$1"
  command -v rsync >/dev/null 2>&1 && deploy_remote_has_rsync "$remote_ssh"
}

# 同步本地目录内容到远端目录（优先 rsync，远端无 rsync 时 tar+scp）
deploy_sync_dir() {
  local local_dir="$1"
  local remote_ssh="$2"
  local remote_dir="$3"
  deploy_ssh "$remote_ssh" "rm -rf '$remote_dir' && mkdir -p '$remote_dir'"
  if deploy_can_rsync "$remote_ssh"; then
    rsync -avz --delete -e "${DEPLOY_RSYNC_SSH:-ssh ${DEPLOY_SSH_OPTS:-}}" "$local_dir" "$remote_ssh:$remote_dir/"
    return
  fi
  local tar="/tmp/novel-agent-sync-$$.tar.gz"
  tar -czf "$tar" -C "$local_dir" .
  deploy_scp "$tar" "$remote_ssh:/tmp/novel-agent-sync-$$.tar.gz"
  deploy_ssh "$remote_ssh" "tar -xzf /tmp/novel-agent-sync-$$.tar.gz -C '$remote_dir' && rm -f /tmp/novel-agent-sync-$$.tar.gz"
  rm -f "$tar"
}

deploy_rsync_to() {
  local repo_root="$1"
  local remote_ssh="$2"
  local remote_dir="$3"
  deploy_ssh "$remote_ssh" "mkdir -p '$remote_dir'"
  local excludes=(
    --exclude '.git'
    --exclude 'node_modules'
    --exclude 'frontend/node_modules'
    --exclude '**/target'
    --exclude '.dev-logs'
    --exclude 'claude-code-ref'
    --exclude '.cursor'
    --exclude 'python-ai/__pycache__'
    --exclude 'python-ai/.venv'
  )
  if deploy_can_rsync "$remote_ssh"; then
    rsync -avz --delete "${excludes[@]}" -e "${DEPLOY_RSYNC_SSH:-ssh ${DEPLOY_SSH_OPTS:-}}" "$repo_root/" "$remote_ssh:$remote_dir/"
  else
    local tar="/tmp/novel-agent-deploy-$$.tar.gz"
    tar -czf "$tar" \
      --exclude='.git' \
      --exclude='node_modules' \
      --exclude='frontend/node_modules' \
      --exclude='**/target' \
      --exclude='.dev-logs' \
      -C "$repo_root" .
    deploy_scp "$tar" "$remote_ssh:/tmp/novel-agent-deploy.tar.gz"
    deploy_ssh "$remote_ssh" "mkdir -p '$remote_dir' && tar -xzf /tmp/novel-agent-deploy.tar.gz -C '$remote_dir' && rm -f /tmp/novel-agent-deploy.tar.gz"
    rm -f "$tar"
  fi
}

deploy_scp_file() {
  local local_file="$1"
  local remote_ssh="$2"
  local remote_path="$3"
  deploy_ssh "$remote_ssh" "mkdir -p '$(dirname "$remote_path")'"
  deploy_scp "$local_file" "$remote_ssh:$remote_path"
}

deploy_compose_up() {
  local remote_ssh="$1"
  local remote_dir="$2"
  local compose_file="$3"
  local env_rel="$4"
  deploy_ssh "$remote_ssh" bash -s <<EOF
set -euo pipefail
cd '$remote_dir'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  COMPOSE="docker-compose"
fi
\$COMPOSE -f '$compose_file' --env-file '$env_rel' build
\$COMPOSE -f '$compose_file' --env-file '$env_rel' up -d
\$COMPOSE -f '$compose_file' --env-file '$env_rel' ps
EOF
}

# 在远端探测 Java 服务端口是否已监听（任意 3 位 HTTP 码视为就绪）
deploy_wait_http_port() {
  local remote_ssh="$1"
  local port="$2"
  local label="${3:-service}"
  local max_attempts="${4:-45}"
  local probe_curl
  case "$port" in
    8080|8081)
      probe_curl="curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 \\
    -X POST \"http://127.0.0.1:${port}/api/auth/api/login\" \\
    -H 'Content-Type: application/json' \\
    -d '{\"username\":\"_probe\",\"password\":\"_probe\"}' 2>/dev/null || echo 000"
      ;;
    *)
      probe_curl="curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 \\
    \"http://127.0.0.1:${port}/\" 2>/dev/null || echo 000"
      ;;
  esac
  deploy_ssh "$remote_ssh" bash -s <<EOF
set -euo pipefail
ok=0
for i in \$(seq 1 $max_attempts); do
  code=\$($probe_curl)
  if [[ "\$code" =~ ^[0-9]{3}\$ && "\$code" != "000" ]]; then
    echo "[deploy] ${label} :${port} ready (probe HTTP \$code, attempt \$i)"
    ok=1
    break
  fi
  sleep 2
done
if [[ "\$ok" -ne 1 ]]; then
  echo "[deploy] ERROR: ${label} :${port} not ready after $max_attempts attempts"
  exit 1
fi
EOF
}

# 在 jump 主机上执行：源机 docker save → 传输（进度条）→ 目标机 docker load
deploy_docker_image_transfer() {
  local jump_ssh="$1"
  local src_spec="$2"
  local dst_mode="$3"
  local dst_spec="${4:-}"
  local image="$5"
  local label="$6"
  local lib_dir
  lib_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local xfer_script="$lib_dir/docker-image-transfer.sh"
  local remote_script="/tmp/novel-agent-docker-image-transfer-$$.sh"

  [[ -f "$xfer_script" ]] || { echo "ERROR: missing $xfer_script" >&2; return 1; }

  deploy_scp "$xfer_script" "$jump_ssh:$remote_script"
  deploy_ssh "$jump_ssh" "sed -i 's/\\r$//' '$remote_script'"
  if [[ "$dst_mode" == "local" ]]; then
    deploy_ssh "$jump_ssh" "bash '$remote_script' '$src_spec' local - '$image' '$label'; rc=\$?; rm -f '$remote_script'; exit \$rc"
  else
    deploy_ssh "$jump_ssh" "bash '$remote_script' '$src_spec' remote '$dst_spec' '$image' '$label'; rc=\$?; rm -f '$remote_script'; exit \$rc"
  fi
}

# 远端 rsync/scp 拉取单文件并显示进度
deploy_remote_pull_file() {
  local jump_ssh="$1"
  local src_spec="$2"
  local src_path="$3"
  local dst_path="$4"
  local label="$5"

  deploy_ssh "$jump_ssh" bash -s -- "$src_spec" "$src_path" "$dst_path" "$label" <<'REMOTE'
set -eu
SRC="$1"
SRC_PATH="$2"
DST_PATH="$3"
LABEL="$4"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=120)
total=$(ssh "${SSH_OPTS[@]}" "$SRC" "stat -c%s '$SRC_PATH' 2>/dev/null || echo 0")

echo "[$(date +%H:%M:%S)] $LABEL: 拉取 $(basename "$SRC_PATH") ..."
if command -v rsync >/dev/null 2>&1; then
  rsync -av --info=progress2 -e "ssh ${SSH_OPTS[*]}" "${SRC}:${SRC_PATH}" "$DST_PATH"
else
  rm -f "${DST_PATH}.part"
  ssh "${SSH_OPTS[@]}" "$SRC" "cat '$SRC_PATH'" > "${DST_PATH}.part" &
  pid=$!
  BAR_WIDTH=36
  human_bytes() {
    local b="${1:-0}"
    command -v numfmt >/dev/null 2>&1 && numfmt --to=iec-i --suffix=B "$b" 2>/dev/null || echo "${b}B"
  }
  while kill -0 "$pid" 2>/dev/null; do
    cur=$(stat -c%s "${DST_PATH}.part" 2>/dev/null || echo 0)
    pct=0; [[ "$total" -gt 0 ]] && pct=$(( cur * 100 / total ))
    filled=$(( pct * BAR_WIDTH / 100 ))
    bar=$(printf '%*s' "$filled" '' | tr ' ' '#')
    pad=$(printf '%*s' "$((BAR_WIDTH - filled))" '' | tr ' ' '.')
    printf "\r[%s] %s [%s%s] %3d%%" "$(date +%H:%M:%S)" "$LABEL" "$bar" "$pad" "$pct"
    sleep 1
  done
  wait "$pid"
  echo ""
  mv "${DST_PATH}.part" "$DST_PATH"
fi
ls -lh "$DST_PATH"
REMOTE
}
