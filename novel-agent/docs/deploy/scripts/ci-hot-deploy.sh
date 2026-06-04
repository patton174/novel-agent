#!/usr/bin/env bash
# GitHub Actions 热部署：CI 编译 → scp jar / 前端 dist → docker cp 重启
#
# 必需环境变量:
#   MW_HOST, WORKER_HOST
#   DEPLOY_SSH_OPTS (例: -i ~/.ssh/deploy_key -o StrictHostKeyChecking=yes)
#
# 变更开关 (true/false):
#   CHANGED_GATEWAY CHANGED_AUTH CHANGED_PYAI CHANGED_CONTENT CHANGED_CONSUMER CHANGED_FRONTEND CHANGED_COMMON
#   FORCE_SERVICE (workflow_dispatch 手动指定: gateway|auth|pyai|content|consumer|frontend)
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
    pyai) CHANGED_GATEWAY=false; CHANGED_AUTH=false; CHANGED_PYAI=true; CHANGED_CONTENT=false; CHANGED_CONSUMER=false; CHANGED_FRONTEND=false ;;
    content) CHANGED_GATEWAY=false; CHANGED_AUTH=false; CHANGED_PYAI=false; CHANGED_CONTENT=true; CHANGED_CONSUMER=false; CHANGED_FRONTEND=false ;;
    consumer) CHANGED_GATEWAY=false; CHANGED_AUTH=false; CHANGED_PYAI=false; CHANGED_CONTENT=false; CHANGED_CONSUMER=true; CHANGED_FRONTEND=false ;;
    frontend) CHANGED_GATEWAY=false; CHANGED_AUTH=false; CHANGED_PYAI=false; CHANGED_CONTENT=false; CHANGED_CONSUMER=false; CHANGED_FRONTEND=true ;;
    *) echo "[ci-hot] 未知 FORCE_SERVICE=$FORCE_SERVICE"; exit 1 ;;
  esac
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
  echo "[ci-hot] frontend build"
  (cd "$REPO_ROOT/frontend" && corepack enable && corepack prepare pnpm@9.15.9 --activate && pnpm install --frozen-lockfile && pnpm run build)
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

want "${CHANGED_GATEWAY:-false}" && hot gateway mw
want "${CHANGED_AUTH:-false}" && hot auth mw
want "${CHANGED_PYAI:-false}" && hot pyai worker
want "${CHANGED_CONTENT:-false}" && hot content worker
want "${CHANGED_CONSUMER:-false}" && hot consumer worker
want "${CHANGED_FRONTEND:-false}" && hot frontend worker

if [[ ${#PIDS[@]} -eq 0 ]]; then
  echo "[ci-hot] 无匹配变更，跳过部署"
  exit 0
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

echo "[ci-hot] 全部热部署完成"
