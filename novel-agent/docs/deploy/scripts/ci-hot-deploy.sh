#!/usr/bin/env bash
# GitHub Actions 热部署：CI 编译 → scp jar / 前端 dist → docker cp 重启
#
# 必需环境变量:
#   MW_HOST, WORKER_HOST
#   DEPLOY_SSH_OPTS (例: -i ~/.ssh/deploy_key -o StrictHostKeyChecking=yes)
#
# 变更开关 (true/false):
#   CHANGED_GATEWAY CHANGED_AUTH CHANGED_PYAI CHANGED_CONTENT CHANGED_CONSUMER CHANGED_FRONTEND CHANGED_COMMON
#   CHANGED_SECURITY CHANGED_DEPLOY_CI
#   FORCE_SERVICE (workflow_dispatch: gateway|auth|mw-auth|pyai|content|consumer|frontend|python-ai)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
cd "$REPO_ROOT"

export MW_HOST="${MW_HOST:?MW_HOST required}"
export WORKER_HOST="${WORKER_HOST:?WORKER_HOST required}"
export MW_SSH="${MW_SSH:-root@${MW_HOST}}"
export WORKER_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"
export MW_REMOTE_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
export WORKER_REMOTE_DIR="${WORKER_REMOTE_DIR:-/opt/novel-agent}"
export DEPLOY_SCP_OPTS="${DEPLOY_SCP_OPTS:-$DEPLOY_SSH_OPTS}"
export DEPLOY_RSYNC_SSH="${DEPLOY_RSYNC_SSH:-ssh ${DEPLOY_SSH_OPTS:-}}"

want() {
  local flag="${1:-false}"
  [[ "$flag" == "true" || "$flag" == "1" ]]
}

if [[ -n "${FORCE_SERVICE:-}" ]]; then
  case "$FORCE_SERVICE" in
    gateway) CHANGED_GATEWAY=true; CHANGED_AUTH=false; CHANGED_PYAI=false; CHANGED_CONTENT=false; CHANGED_CONSUMER=false; CHANGED_FRONTEND=false ;;
    auth) CHANGED_GATEWAY=false; CHANGED_AUTH=true; CHANGED_PYAI=false; CHANGED_CONTENT=false; CHANGED_CONSUMER=false; CHANGED_FRONTEND=false ;;
    mw-auth)
      CHANGED_GATEWAY=true
      CHANGED_AUTH=true
      CHANGED_PYAI=false
      CHANGED_CONTENT=false
      CHANGED_CONSUMER=false
      CHANGED_FRONTEND=false
      CHANGED_PYTHON_AI=false
      ;;
    pyai) CHANGED_GATEWAY=false; CHANGED_AUTH=false; CHANGED_PYAI=true; CHANGED_CONTENT=false; CHANGED_CONSUMER=false; CHANGED_FRONTEND=false ;;
    content) CHANGED_GATEWAY=false; CHANGED_AUTH=false; CHANGED_PYAI=false; CHANGED_CONTENT=true; CHANGED_CONSUMER=false; CHANGED_FRONTEND=false ;;
    consumer) CHANGED_GATEWAY=false; CHANGED_AUTH=false; CHANGED_PYAI=false; CHANGED_CONTENT=false; CHANGED_CONSUMER=true; CHANGED_FRONTEND=false ;;
    frontend) CHANGED_GATEWAY=false; CHANGED_AUTH=false; CHANGED_PYAI=false; CHANGED_CONTENT=false; CHANGED_CONSUMER=false; CHANGED_FRONTEND=true; CHANGED_PYTHON_AI=false ;;
    python-ai) CHANGED_GATEWAY=false; CHANGED_AUTH=false; CHANGED_PYAI=false; CHANGED_CONTENT=false; CHANGED_CONSUMER=false; CHANGED_FRONTEND=false; CHANGED_PYTHON_AI=true ;;
    *) echo "[ci-hot] 未知 FORCE_SERVICE=$FORCE_SERVICE"; exit 1 ;;
  esac
fi

# JWT 安全栈：auth 与 gateway 必须同版本发布
if want "${CHANGED_AUTH:-false}" || want "${CHANGED_GATEWAY:-false}" || want "${CHANGED_SECURITY:-false}"; then
  CHANGED_AUTH=true
  CHANGED_GATEWAY=true
fi

# 前端安全层变更时同步 MW（避免 gateway 新 / auth 旧）
if want "${CHANGED_SECURITY:-false}"; then
  echo "[ci-hot] security paths changed → sync MW auth + gateway"
fi

# 部署脚本/workflow 变更：补发 MW 安全栈，修复半升级
if want "${CHANGED_DEPLOY_CI:-false}"; then
  echo "[ci-hot] deploy/ci changed → sync MW auth + gateway (rebuild)"
  CHANGED_AUTH=true
  CHANGED_GATEWAY=true
  export MW_JAVA_REBUILD=1
fi

if want "${CHANGED_COMMON:-false}"; then
  CHANGED_GATEWAY=true
  CHANGED_AUTH=true
  CHANGED_PYAI=true
  CHANGED_CONTENT=true
  CHANGED_CONSUMER=true
fi

MODULES=()
want "${CHANGED_GATEWAY:-false}" && MODULES+=(agent-gateway)
want "${CHANGED_AUTH:-false}" && MODULES+=(agent-auth)
want "${CHANGED_PYAI:-false}" && MODULES+=(agent-pyai)
want "${CHANGED_CONTENT:-false}" && MODULES+=(agent-content)
want "${CHANGED_CONSUMER:-false}" && MODULES+=(agent-consumer)

if [[ ${#MODULES[@]} -gt 0 ]]; then
  PL=$(IFS=,; echo "${MODULES[*]}")
  echo "[ci-hot] mvn -pl $PL -am package -DskipTests"
  (cd "$REPO_ROOT/novel-agent" && mvn -q -pl "$PL" -am package -DskipTests)
fi

if want "${CHANGED_FRONTEND:-false}"; then
  echo "[ci-hot] frontend build (AES + route/field crypto enabled)"
  (
    cd "$REPO_ROOT/frontend"
    corepack enable && corepack prepare pnpm@9.15.9 --activate
    pnpm install --frozen-lockfile
    VITE_SECURITY_AES=true VITE_ROUTE_OBFUSCATION=true VITE_FIELD_ENCRYPTION=true pnpm run build
  )
fi

PIDS=()
hot() {
  local svc="$1" target="$2"
  echo "[ci-hot] deploy-fast $svc $target"
  if [[ "${GITHUB_ACTIONS:-}" == "true" && "${CI_PARALLEL_DEPLOY:-0}" != "1" ]]; then
    # CI 串行部署，避免多路 scp/ssh 残留导致 Post job cleanup 挂死
    SKIP_BUILD=1 bash "$SCRIPT_DIR/deploy-fast.sh" "$svc" "$target"
  else
    SKIP_BUILD=1 bash "$SCRIPT_DIR/deploy-fast.sh" "$svc" "$target" &
    PIDS+=($!)
  fi
}

want "${CHANGED_AUTH:-false}" && hot auth mw
want "${CHANGED_GATEWAY:-false}" && hot gateway mw
want "${CHANGED_PYAI:-false}" && hot pyai worker
want "${CHANGED_CONTENT:-false}" && hot content worker
want "${CHANGED_CONSUMER:-false}" && hot consumer worker
want "${CHANGED_FRONTEND:-false}" && hot frontend worker

hot_python() {
  echo "[ci-hot] python-ai sync + docker rebuild on worker"
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/_deploy-lib.sh"
  deploy_ssh "$WORKER_SSH" "mkdir -p '$WORKER_REMOTE_DIR/python-ai'"
  if deploy_can_rsync "$WORKER_SSH"; then
    rsync -avz \
      -e "${DEPLOY_RSYNC_SSH}" \
      "$REPO_ROOT/python-ai/app" \
      "$REPO_ROOT/python-ai/requirements.txt" \
      "$WORKER_SSH:$WORKER_REMOTE_DIR/python-ai/"
  else
    local tar="/tmp/python-ai-sync-$$.tar.gz"
    tar -czf "$tar" -C "$REPO_ROOT/python-ai" app requirements.txt
    deploy_scp "$tar" "$WORKER_SSH:/tmp/python-ai-sync-$$.tar.gz"
    deploy_ssh "$WORKER_SSH" "tar -xzf /tmp/python-ai-sync-$$.tar.gz -C '$WORKER_REMOTE_DIR/python-ai' && rm -f /tmp/python-ai-sync-$$.tar.gz"
    rm -f "$tar"
  fi
  deploy_ssh "$WORKER_SSH" bash -s <<EOF
set -euo pipefail
cd '$WORKER_REMOTE_DIR'
COMPOSE='docker compose'
if ! docker compose version >/dev/null 2>&1; then COMPOSE='docker-compose'; fi
CF='novel-agent/docs/deploy/docker/docker-compose.worker.yml'
ENV='novel-agent/docs/deploy/docker/.env.worker'
\$COMPOSE -f "\$CF" --env-file "\$ENV" build python-ai
\$COMPOSE -f "\$CF" --env-file "\$ENV" up -d --no-deps python-ai python-ai-2
EOF
}

if want "${CHANGED_PYTHON_AI:-false}"; then
  hot_python
fi

if [[ ${#PIDS[@]} -eq 0 ]] && ! want "${CHANGED_PYTHON_AI:-false}"; then
  if ! want "${CHANGED_AUTH:-false}" && ! want "${CHANGED_GATEWAY:-false}"; then
    echo "[ci-hot] 无匹配变更，跳过部署"
    exit 0
  fi
  echo "[ci-hot] MW 安全栈已串行部署"
fi

FAIL=0
for pid in "${PIDS[@]}"; do
  wait "$pid" || FAIL=1
done
[[ "$FAIL" -eq 0 ]] || exit 1

# 确保 CI runner 无残留 ssh/scp（否则 Post job cleanup 会长时间等待）
if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
  for _ in 1 2 3; do
    pgrep -f 'ssh.*deploy_key|scp.*deploy_key' >/dev/null || break
    sleep 2
  done
  pkill -f 'ssh.*deploy_key' 2>/dev/null || true
  pkill -f 'scp.*deploy_key' 2>/dev/null || true
fi

sync_crypto_register() {
  echo "[ci-hot] crypto register（同步 Redis bootstrap + Worker crypto-runtime.json）"
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/_deploy-lib.sh"
  export MW_HOST="${MW_HOST:?}"
  export WORKER_HOST="${WORKER_HOST:?}"
  export MW_SSH="${MW_SSH:-root@${MW_HOST}}"
  export WORKER_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"
  if ! load_internal_service_key_from_mw; then
    echo "[ci-hot] WARN: skip crypto register — 无法从 MW .env.mw 读取 AGENT_INTERNAL_SERVICE_KEY"
    return 0
  fi
  bash "$SCRIPT_DIR/register-frontend-crypto.sh" || {
    echo "[ci-hot] WARN: crypto register 失败，/g/ 路由可能 stale"
    return 0
  }
}

if want "${CHANGED_AUTH:-false}" || want "${CHANGED_GATEWAY:-false}"; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/_deploy-lib.sh"
  deploy_wait_http_port "$MW_SSH" 8080 "gateway" 30
fi

if want "${CHANGED_AUTH:-false}" || want "${CHANGED_GATEWAY:-false}" || want "${CHANGED_FRONTEND:-false}" || want "${CHANGED_SECURITY:-false}"; then
  sync_crypto_register
fi

echo "[ci-hot] 全部热部署完成"
