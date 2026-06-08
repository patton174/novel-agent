#!/usr/bin/env bash
# Worker 容器内存重平衡（本地或 CI 调用 → scp 脚本后在 Worker 执行）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
DOCKER_DIR="$(cd "$SCRIPT_DIR/../docker" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"

WK="${WORKER_SSH:-root@${WORKER_HOST:?WORKER_HOST required}}"
DIR="${WORKER_REMOTE_DIR:-/opt/novel-agent}"

echo "=== Worker: 同步 compose/nginx 并应用内存配置 ==="
deploy_ssh "$WK" "mkdir -p '$DIR/novel-agent/agent-document/docs/deploy/docker' '$DIR/novel-agent/agent-document/docs/deploy/scripts'"
deploy_scp "$DOCKER_DIR/docker-compose.worker.yml" "$WK:$DIR/novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml"

if [[ "${WORKER_COMPOSE_SYNC_ONLY:-0}" == "1" ]]; then
  echo "[update-worker-memory] compose-only sync (skip python-lb / memory apply)"
  exit 0
fi

deploy_scp "$DOCKER_DIR/nginx-python-lb-worker.conf" "$WK:$DIR/novel-agent/agent-document/docs/deploy/docker/nginx-python-lb-worker.conf"
deploy_scp "$SCRIPT_DIR/update-worker-crawl-env.sh" "$WK:$DIR/novel-agent/agent-document/docs/deploy/scripts/update-worker-crawl-env.sh"
deploy_scp "$SCRIPT_DIR/worker-apply-infra.sh" "$WK:$DIR/novel-agent/agent-document/docs/deploy/scripts/worker-apply-infra.sh"
deploy_ssh "$WK" "chmod +x '$DIR/novel-agent/agent-document/docs/deploy/scripts/worker-apply-infra.sh' '$DIR/novel-agent/agent-document/docs/deploy/scripts/update-worker-crawl-env.sh' && DEPLOY_DIR='$DIR' bash '$DIR/novel-agent/agent-document/docs/deploy/scripts/worker-apply-infra.sh'"

sleep 8
deploy_ssh "$WK" "docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}' \$(docker ps --filter name=novel-agent-worker --format '{{.Names}}' | head -8 | tr '\n' ' ')"
echo "[update-worker-memory] done"
