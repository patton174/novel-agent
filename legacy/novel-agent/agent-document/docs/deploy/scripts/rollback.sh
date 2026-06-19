#!/usr/bin/env bash
# 回滚 CI 部署的 Java 服务（恢复 backups/ 中上一版 jar 并重建 runtime 镜像）
#
# 用法：
#   bash legacy/novel-agent/agent-document/docs/deploy/scripts/rollback.sh gateway mw
#   bash legacy/novel-agent/agent-document/docs/deploy/scripts/rollback.sh billing mw
#   bash legacy/novel-agent/agent-document/docs/deploy/scripts/rollback.sh pyai worker
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$SCRIPT_DIR/../docker/.env.split}"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"
if [[ -f "$SPLIT_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$SPLIT_ENV"
fi
: "${MW_HOST:?MW_HOST 未设置}"
: "${WORKER_HOST:?WORKER_HOST 未设置}"

SERVICE="${1:?用法: rollback.sh <gateway|auth|consumer|billing|pyai|content> <mw|worker> [backup_jar_name]}"
TARGET="${2:?用法: rollback.sh <service> <mw|worker>}"
BACKUP_NAME="${3:-}"

case "$SERVICE" in
  gateway|gw) COMPOSE_SVC="agent-gateway"; IMAGE="novel-agent/gateway:latest" ;;
  auth)       COMPOSE_SVC="agent-auth";    IMAGE="novel-agent/auth:latest" ;;
  consumer)   COMPOSE_SVC="agent-consumer"; IMAGE="novel-agent/consumer:latest" ;;
  billing)    COMPOSE_SVC="agent-billing";  IMAGE="novel-agent/billing:latest" ;;
  pyai)       COMPOSE_SVC="agent-pyai";     IMAGE="novel-agent/pyai:latest" ;;
  content)    COMPOSE_SVC="agent-content";  IMAGE="novel-agent/content:latest" ;;
  *)
    echo "[rollback] 不支持的服务: $SERVICE"
    exit 1
    ;;
esac

if [[ "$TARGET" == "mw" ]]; then
  REMOTE_SSH="${MW_SSH:-root@${MW_HOST}}"
  REMOTE_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
  COMPOSE_FILE="legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml"
  ENV_REL="legacy/novel-agent/agent-document/docs/deploy/docker/.env.mw"
else
  REMOTE_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"
  REMOTE_DIR="${WORKER_REMOTE_DIR:-/opt/novel-agent}"
  COMPOSE_FILE="legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml"
  ENV_REL="legacy/novel-agent/agent-document/docs/deploy/docker/.env.worker"
fi

echo "[rollback] 回滚 $COMPOSE_SVC @ $TARGET ..."
deploy_ssh "$REMOTE_SSH" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
BACKUP=""
if [[ -n "$BACKUP_NAME" ]]; then
  [[ -f "backups/$BACKUP_NAME" ]] && BACKUP="backups/$BACKUP_NAME"
fi
if [[ -z "\$BACKUP" ]]; then
  BACKUP=\$(ls -1t backups/${SERVICE}-*-prev.jar backups/${SERVICE}-*.jar 2>/dev/null | head -1 || true)
fi
if [[ -z "\$BACKUP" || ! -f "\$BACKUP" ]]; then
  echo "[rollback] 找不到 backups/${SERVICE}-*.jar"
  exit 1
fi
echo "[rollback] 使用: \$BACKUP"
STAGE='$REMOTE_DIR/deploy-staging/$SERVICE'
mkdir -p "\$STAGE"
cp "\$BACKUP" "\$STAGE/app.jar"
cp legacy/novel-agent/agent-document/docs/deploy/docker/Dockerfile.java.runtime "\$STAGE/Dockerfile"
cd "\$STAGE"
docker build -f Dockerfile --build-arg JAR=app.jar -t '$IMAGE' .
\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' up -d --no-deps --no-build '$COMPOSE_SVC'
sleep 8
case '$COMPOSE_SVC' in
  agent-gateway)  H="http://127.0.0.1:8080/actuator/health" ;;
  agent-auth)     H="http://127.0.0.1:8081/actuator/health" ;;
  agent-consumer) H="http://127.0.0.1:8090/actuator/health" ;;
  agent-billing)  H="http://127.0.0.1:8092/actuator/health" ;;
  agent-pyai)     H="http://127.0.0.1:8082/actuator/health" ;;
  agent-content)  H="http://127.0.0.1:8091/actuator/health" ;;
esac
code=\$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 3 "\$H" || echo 000)
echo "[rollback] health \$H → HTTP \$code"
[[ "\$code" == "200" ]] || exit 1
echo "[rollback] $COMPOSE_SVC 已回滚"
EOF
