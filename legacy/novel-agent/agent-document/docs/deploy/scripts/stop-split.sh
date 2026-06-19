#!/usr/bin/env bash
# 停止双机已部署的业务容器（不影响 Nacos/PG/Redis/MQ 等中间件）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/../docker" && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$DEPLOY_DIR/.env.split}"

# shellcheck disable=SC1090
source "$SPLIT_ENV"

MW_SSH="${MW_SSH:-root@${MW_HOST}}"
WORKER_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"
MW_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
WORKER_DIR="${WORKER_REMOTE_DIR:-/opt/novel-agent}"

stop_on() {
  local label="$1"
  local ssh_host="$2"
  local dir="$3"
  local compose="$4"
  local envf="$5"
  echo "[$label] 停止 compose 服务..."
  ssh "$ssh_host" bash -s <<EOF
set -euo pipefail
cd '$dir'
if [[ -f '$compose' && -f '$envf' ]]; then
  COMPOSE="docker compose"
  if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
  \$COMPOSE -f '$compose' --env-file '$envf' down || true
fi
echo "[$label] 剩余 novel-agent 容器:"
docker ps -a --filter name=novel-agent --format '  {{.Names}}  {{.Status}}' || true
EOF
}

stop_on "MW" "$MW_SSH" "$MW_DIR" \
  "legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml" \
  "legacy/novel-agent/agent-document/docs/deploy/docker/.env.mw"

stop_on "Worker" "$WORKER_SSH" "$WORKER_DIR" \
  "legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml" \
  "legacy/novel-agent/agent-document/docs/deploy/docker/.env.worker"

echo "[stop-split] 完成"
