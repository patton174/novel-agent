#!/usr/bin/env bash
# GitHub Actions 热部署：CI 编译 → scp jar / 前端 dist → docker cp 重启
#
# 必需环境变量:
#   MW_HOST, WORKER_HOST
#   DEPLOY_SSH_OPTS (例: -i ~/.ssh/deploy_key -o StrictHostKeyChecking=yes)
#
# 变更开关 (true/false):
#   CHANGED_GATEWAY CHANGED_AUTH CHANGED_PYAI CHANGED_CONTENT CHANGED_CONSUMER CHANGED_BILLING CHANGED_FRONTEND CHANGED_COMMON
#   CHANGED_SECURITY CHANGED_DEPLOY_CI
#   手动多选（任一非空即覆盖路径过滤，可组合）:
#     FORCE_SERVICES   逗号分隔: gateway,auth,mw-auth,pyai,content,consumer,billing,frontend,python-ai
#     FORCE_SERVICE    兼容旧版单服务
#     FORCE_DEPLOY_*   workflow_dispatch 布尔: MW_AUTH GATEWAY AUTH PYAI CONTENT CONSUMER FRONTEND PYTHON_AI
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
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

reset_deploy_flags() {
  CHANGED_GATEWAY=false
  CHANGED_AUTH=false
  CHANGED_PYAI=false
  CHANGED_CONTENT=false
  CHANGED_CONSUMER=false
  CHANGED_BILLING=false
  CHANGED_FRONTEND=false
  CHANGED_PYTHON_AI=false
  CHANGED_SECURITY=false
  CHANGED_DEPLOY_CI=false
  CHANGED_COMMON=false
}

enable_force_service() {
  case "$1" in
    gateway) CHANGED_GATEWAY=true ;;
    auth) CHANGED_AUTH=true ;;
    mw-auth) CHANGED_GATEWAY=true; CHANGED_AUTH=true ;;
    pyai) CHANGED_PYAI=true ;;
    content) CHANGED_CONTENT=true ;;
    consumer) CHANGED_CONSUMER=true ;;
    billing) CHANGED_BILLING=true ;;
    frontend) CHANGED_FRONTEND=true ;;
    python-ai) CHANGED_PYTHON_AI=true ;;
    *)
      echo "[ci-hot] 未知服务: $1（可用: gateway auth mw-auth pyai content consumer billing frontend python-ai）"
      exit 1
      ;;
  esac
}

# 返回 0=已进入手动模式并设置 CHANGED_*；1=未选手动，沿用路径过滤 env
apply_manual_deploy_selection() {
  local -a services=()
  local raw item

  if [[ -n "${FORCE_SERVICES:-}" ]]; then
    raw="${FORCE_SERVICES// /}"
    IFS=',' read -r -a services <<< "$raw"
  elif [[ -n "${FORCE_SERVICE:-}" ]]; then
    services=("$FORCE_SERVICE")
  else
    want "${FORCE_DEPLOY_MW_AUTH:-false}" && services+=(mw-auth)
    want "${FORCE_DEPLOY_GATEWAY:-false}" && services+=(gateway)
    want "${FORCE_DEPLOY_AUTH:-false}" && services+=(auth)
    want "${FORCE_DEPLOY_PYAI:-false}" && services+=(pyai)
    want "${FORCE_DEPLOY_CONTENT:-false}" && services+=(content)
    want "${FORCE_DEPLOY_CONSUMER:-false}" && services+=(consumer)
    want "${FORCE_DEPLOY_BILLING:-false}" && services+=(billing)
    want "${FORCE_DEPLOY_FRONTEND:-false}" && services+=(frontend)
    want "${FORCE_DEPLOY_PYTHON_AI:-false}" && services+=(python-ai)
  fi

  if [[ ${#services[@]} -eq 0 ]]; then
    return 1
  fi

  reset_deploy_flags
  for item in "${services[@]}"; do
    [[ -n "$item" ]] || continue
    enable_force_service "$item"
  done
  echo "[ci-hot] 手动部署服务: ${services[*]}"
  return 0
}

if apply_manual_deploy_selection; then
  :
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

# 部署脚本/workflow/Worker compose 变更：同步 compose；全量 infra 可选
if want "${CHANGED_DEPLOY_CI:-false}"; then
  echo "[ci-hot] deploy/ci changed → sync worker compose + deploy worker stack"
  CHANGED_CONTENT=true
  CHANGED_CONSUMER=true
  CHANGED_BILLING=true
  CHANGED_PYAI=true
  CHANGED_PYTHON_AI=true
  CHANGED_FRONTEND=true
  export WORKER_INFRA_SYNC=1
  export WORKER_COMPOSE_SYNC_ONLY=1
  export WORKER_JAVA_RECREATE=1
fi

if want "${CHANGED_COMMON:-false}"; then
  CHANGED_GATEWAY=true
  CHANGED_AUTH=true
  CHANGED_PYAI=true
  CHANGED_CONTENT=true
  CHANGED_CONSUMER=true
  CHANGED_BILLING=true
fi

# 前端已切到 /api/content/auth/*；仅发 frontend 时 Worker content 若未升级会整站 404
if want "${CHANGED_FRONTEND:-false}"; then
  CHANGED_CONTENT=true
fi

# billing 首次上线或 compose 新增服务：先同步 Worker compose；强制 recreate 以注入 DB/Redis 等 env
if want "${CHANGED_BILLING:-false}"; then
  echo "[ci-hot] billing changed → sync worker compose + recreate agent-billing"
  export WORKER_INFRA_SYNC=1
  export WORKER_JAVA_RECREATE=1
  if ! want "${CHANGED_DEPLOY_CI:-false}"; then
    export WORKER_COMPOSE_SYNC_ONLY=1
  fi
fi

MODULES=()
want "${CHANGED_GATEWAY:-false}" && MODULES+=(agent-gateway)
want "${CHANGED_AUTH:-false}" && MODULES+=(agent-auth)
want "${CHANGED_PYAI:-false}" && MODULES+=(agent-pyai)
want "${CHANGED_CONTENT:-false}" && MODULES+=(agent-content)
want "${CHANGED_CONSUMER:-false}" && MODULES+=(agent-consumer)
want "${CHANGED_BILLING:-false}" && MODULES+=(agent-billing)

if [[ ${#MODULES[@]} -gt 0 ]]; then
  if want "${CHANGED_AUTH:-false}"; then
    echo "[ci-hot] build MJML email templates"
    bash "$SCRIPT_DIR/build-email-templates.sh"
  fi
  PL=""
  for m in "${MODULES[@]}"; do
    [[ -n "$PL" ]] && PL+=","
    PL+=":$m"
  done
  echo "[ci-hot] mvn -pl $PL -am package -DskipTests"
  (cd "$REPO_ROOT/novel-agent" && mvn -q -pl "$PL" -am package -DskipTests)
fi

if want "${CHANGED_FRONTEND:-false}"; then
  echo "[ci-hot] frontend build (AES + route/field crypto enabled)"
  (
    cd "$REPO_ROOT/frontend"
    corepack enable && corepack prepare pnpm@9.15.9 --activate
    pnpm install --frozen-lockfile
    VITE_SECURITY_AES=true VITE_ROUTE_OBFUSCATION=true VITE_FIELD_ENCRYPTION=true VITE_SECURITY_ENCRYPT_STREAM=true pnpm run build
  )
fi

if want "${WORKER_INFRA_SYNC:-false}"; then
  echo "[ci-hot] worker infra: python-lb + memory + compose (before jar hot deploy)"
  bash "$SCRIPT_DIR/update-worker-memory.sh"
fi

PIDS=()
hot() {
  local svc="$1" target="$2"
  echo "[ci-hot] deploy-fast $svc $target"
  local -a hot_env=(SKIP_BUILD=1)
  if [[ "$target" == "worker" && "$svc" =~ ^(content|consumer|pyai|billing)$ ]]; then
    hot_env+=(WORKER_JAVA_RECREATE="${WORKER_JAVA_RECREATE:-0}")
  fi
  if [[ "$svc" == "frontend" && "$target" == "worker" ]]; then
    # ci-hot 已预编译 dist，避免 deploy-fast 二次 build + 二次 crypto register
    hot_env+=(SKIP_FRONTEND_BUILD=1 SKIP_CRYPTO_REGISTER=1)
  fi
  if [[ "${GITHUB_ACTIONS:-}" == "true" && "${CI_PARALLEL_DEPLOY:-0}" != "1" ]]; then
    # CI 串行部署，避免多路 scp/ssh 残留导致 Post job cleanup 挂死
    env "${hot_env[@]}" bash "$SCRIPT_DIR/deploy-fast.sh" "$svc" "$target"
  else
    env "${hot_env[@]}" bash "$SCRIPT_DIR/deploy-fast.sh" "$svc" "$target" &
    PIDS+=($!)
  fi
}

want "${CHANGED_AUTH:-false}" && hot auth mw
want "${CHANGED_GATEWAY:-false}" && hot gateway mw
want "${CHANGED_PYAI:-false}" && hot pyai worker
want "${CHANGED_CONTENT:-false}" && hot content worker
want "${CHANGED_CONSUMER:-false}" && hot consumer worker
want "${CHANGED_BILLING:-false}" && hot billing worker
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
    deploy_ssh "$WORKER_SSH" "mkdir -p '$WORKER_REMOTE_DIR/novel-agent/agent-document/docs/deploy/docker'"
    rsync -avz \
      -e "${DEPLOY_RSYNC_SSH}" \
      "$REPO_ROOT/novel-agent/agent-document/docs/deploy/docker/Dockerfile.python-ai" \
      "$WORKER_SSH:$WORKER_REMOTE_DIR/novel-agent/agent-document/docs/deploy/docker/"
  else
    local tar="/tmp/python-ai-sync-$$.tar.gz"
    tar -czf "$tar" -C "$REPO_ROOT/python-ai" app requirements.txt
    deploy_scp "$tar" "$WORKER_SSH:/tmp/python-ai-sync-$$.tar.gz"
    deploy_ssh "$WORKER_SSH" "tar -xzf /tmp/python-ai-sync-$$.tar.gz -C '$WORKER_REMOTE_DIR/python-ai' && rm -f /tmp/python-ai-sync-$$.tar.gz"
    deploy_ssh "$WORKER_SSH" "mkdir -p '$WORKER_REMOTE_DIR/novel-agent/agent-document/docs/deploy/docker'"
    deploy_scp "$REPO_ROOT/novel-agent/agent-document/docs/deploy/docker/Dockerfile.python-ai" \
      "$WORKER_SSH:$WORKER_REMOTE_DIR/novel-agent/agent-document/docs/deploy/docker/Dockerfile.python-ai"
    rm -f "$tar"
  fi
  deploy_ssh "$WORKER_SSH" bash -s <<EOF
set -euo pipefail
cd '$WORKER_REMOTE_DIR'
PYENV='python-ai/.env'
if [[ -f "\$PYENV" ]]; then
  if grep -q '^CRAWL_ORCHESTRATOR_ENABLED=' "\$PYENV"; then
    sed -i 's/^CRAWL_ORCHESTRATOR_ENABLED=.*/CRAWL_ORCHESTRATOR_ENABLED=true/' "\$PYENV"
  else
    echo 'CRAWL_ORCHESTRATOR_ENABLED=true' >> "\$PYENV"
  fi
fi
COMPOSE='docker compose'
if ! docker compose version >/dev/null 2>&1; then COMPOSE='docker-compose'; fi
CF='novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml'
ENV='novel-agent/agent-document/docs/deploy/docker/.env.worker'
LEGACY_ENV='novel-agent/docs/deploy/docker/.env.worker'
if [[ ! -f "\$ENV" && -f "\$LEGACY_ENV" ]]; then
  mkdir -p "\$(dirname "\$ENV")"
  cp "\$LEGACY_ENV" "\$ENV"
  echo "[ci-hot] migrated .env.worker from legacy path"
fi
if [[ ! -f "\$ENV" ]]; then
  echo "[ci-hot] missing \$ENV on worker — run setup-split-config.sh on server"
  exit 1
fi
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

if want "${CHANGED_CONTENT:-false}"; then
  echo "[ci-hot] smoke: Worker content /api/content/auth/novels 必须非 404"
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/_deploy-lib.sh"
  smoke_ok=0
  for i in $(seq 1 20); do
    code=$(deploy_ssh "$WORKER_SSH" \
      "curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 http://127.0.0.1:8091/api/content/auth/novels" \
      2>/dev/null || echo 000)
    if [[ "$code" != "404" && "$code" != "000" ]]; then
      echo "[ci-hot] content smoke OK (HTTP $code, attempt $i)"
      smoke_ok=1
      break
    fi
    sleep 3
  done
  if [[ "$smoke_ok" -ne 1 ]]; then
    echo "[ci-hot] ERROR: content 仍是旧版或未启动（/api/content/auth/novels → 404）"
    exit 1
  fi
fi

if want "${CHANGED_BILLING:-false}"; then
  echo "[ci-hot] smoke: Worker billing /actuator/health"
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/_deploy-lib.sh"
  smoke_ok=0
  for i in $(seq 1 40); do
    code=$(deploy_ssh "$WORKER_SSH" \
      "curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 http://127.0.0.1:8092/actuator/health" \
      2>/dev/null || echo 000)
    if [[ "$code" == "200" ]]; then
      echo "[ci-hot] billing smoke OK (HTTP $code, attempt $i)"
      smoke_ok=1
      break
    fi
    sleep 3
  done
  if [[ "$smoke_ok" -ne 1 ]]; then
    echo "[ci-hot] ERROR: agent-billing 未就绪（/actuator/health → $code）"
    exit 1
  fi
fi

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

if want "${CHANGED_FRONTEND:-false}" || want "${WORKER_INFRA_SYNC:-false}"; then
  echo "[ci-hot] sync nginx /g/ routes (MW entry + Worker frontend)"
  bash "$SCRIPT_DIR/sync-nginx-g-routes.sh" || {
    echo "[ci-hot] WARN: sync-nginx-g-routes 失败，加密 API 可能 405"
  }
fi

echo "[ci-hot] 全部热部署完成"
