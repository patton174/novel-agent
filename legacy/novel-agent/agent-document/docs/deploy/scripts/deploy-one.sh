#!/usr/bin/env bash
# 单服务 Docker 镜像重建（慢：rsync + 容器内 Maven + compose down）
# 日常改代码请用：gh workflow run deploy-gateway.yml 或 ci-deploy-service.sh gateway mw
#
#   bash legacy/novel-agent/agent-document/docs/deploy/scripts/deploy-one.sh [service] [host]
# 例: bash legacy/novel-agent/agent-document/docs/deploy/scripts/deploy-one.sh agent-auth mw
# 加速：SKIP_RSYNC=1 bash .../deploy-one.sh agent-gateway mw
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/../docker" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../../.." && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$DEPLOY_DIR/.env.split}"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"

SERVICE="${1:-agent-auth}"
TARGET="${2:-mw}"

# shellcheck disable=SC1090
source "$SPLIT_ENV"

if [[ "$TARGET" == "mw" ]]; then
  REMOTE_SSH="${MW_SSH:-root@${MW_HOST}}"
  REMOTE_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
  COMPOSE_FILE="legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml"
  ENV_REL="legacy/novel-agent/agent-document/docs/deploy/docker/.env.mw"
  ENV_LOCAL="$DEPLOY_DIR/.env.mw"
else
  REMOTE_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"
  REMOTE_DIR="${WORKER_REMOTE_DIR:-/opt/novel-agent}"
  COMPOSE_FILE="legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml"
  ENV_REL="legacy/novel-agent/agent-document/docs/deploy/docker/.env.worker"
  ENV_LOCAL="$DEPLOY_DIR/.env.worker"
fi

if [[ ! -f "$ENV_LOCAL" ]]; then
  bash "$SCRIPT_DIR/setup-split-config.sh"
fi

echo "[deploy-one] 目标: $TARGET ($REMOTE_SSH)  服务: $SERVICE"
if [[ "${SKIP_RSYNC:-0}" != "1" ]]; then
  echo "[deploy-one] 同步代码..."
  deploy_rsync_to "$REPO_ROOT" "$REMOTE_SSH" "$REMOTE_DIR"
else
  echo "[deploy-one] SKIP_RSYNC=1，跳过全量 rsync"
fi
deploy_scp_file "$ENV_LOCAL" "$REMOTE_SSH" "$REMOTE_DIR/$ENV_REL"
if [[ "$TARGET" == "worker" ]]; then
  deploy_scp_file "$DEPLOY_DIR/docker-compose.worker.yml" "$REMOTE_SSH" "$REMOTE_DIR/$COMPOSE_FILE"
else
  deploy_scp_file "$DEPLOY_DIR/docker-compose.mw.yml" "$REMOTE_SSH" "$REMOTE_DIR/$COMPOSE_FILE"
fi

echo "[deploy-one] build/up $SERVICE（不 down 整栈；要停栈设 COMPOSE_DOWN=1）..."
ssh "$REMOTE_SSH" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
if [[ "${COMPOSE_DOWN:-0}" == "1" ]]; then
  \$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' down || true
fi
\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' build '$SERVICE'
\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' up -d --no-deps '$SERVICE'
sleep 25
echo "=== ps ==="
\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' ps
echo "=== env (datasource/nacos) ==="
CID=\$(\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' ps -q '$SERVICE')
docker inspect "\$CID" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E 'SPRING_|NACOS_' || true
echo "=== logs (tail 60) ==="
docker logs "\$CID" --tail 60 2>&1
EOF

echo "[deploy-one] 完成。查看 Nacos 控制台命名空间: $NACOS_NAMESPACE"
