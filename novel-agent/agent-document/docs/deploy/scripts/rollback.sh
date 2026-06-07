#!/usr/bin/env bash
# 一键回滚 deploy-fast 热替换的 Java 服务（恢复上一版 app.jar）
#
# 用法：
#   bash novel-agent/agent-document/docs/deploy/scripts/rollback.sh pyai worker
#   bash novel-agent/agent-document/docs/deploy/scripts/rollback.sh content worker
#   bash novel-agent/agent-document/docs/deploy/scripts/rollback.sh gateway mw
#
# 可选第三参数为备份文件名（默认 deploy-fast 留下的 *-bak.jar）：
#   bash novel-agent/agent-document/docs/deploy/scripts/rollback.sh pyai worker agent-pyai-abc1234.jar
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

SERVICE="${1:?用法: rollback.sh <gateway|auth|pyai|content|consumer> <mw|worker> [backup_jar_name]}"
TARGET="${2:?用法: rollback.sh <service> <mw|worker>}"
BACKUP_NAME="${3:-}"

case "$SERVICE" in
  gateway|gw) COMPOSE_SVC="agent-gateway" ;;
  auth)       COMPOSE_SVC="agent-auth" ;;
  pyai)       COMPOSE_SVC="agent-pyai" ;;
  content)    COMPOSE_SVC="agent-content" ;;
  consumer)   COMPOSE_SVC="agent-consumer" ;;
  *)
    echo "[rollback] 不支持的服务: $SERVICE"
    exit 1
    ;;
esac

if [[ "$TARGET" == "mw" ]]; then
  REMOTE_SSH="${MW_SSH:-root@${MW_HOST}}"
  REMOTE_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
  COMPOSE_FILE="novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml"
  ENV_REL="novel-agent/agent-document/docs/deploy/docker/.env.mw"
else
  REMOTE_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"
  REMOTE_DIR="${WORKER_REMOTE_DIR:-/opt/novel-agent}"
  COMPOSE_FILE="novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml"
  ENV_REL="novel-agent/agent-document/docs/deploy/docker/.env.worker"
fi

echo "[rollback] 回滚 $COMPOSE_SVC @ $TARGET ..."
deploy_ssh "$REMOTE_SSH" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
CID=\$(\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' ps -q '$COMPOSE_SVC')
if [[ -z "\$CID" ]]; then
  echo "[rollback] 容器 $COMPOSE_SVC 未运行"
  exit 1
fi
BACKUP=""
if [[ -n "$BACKUP_NAME" ]]; then
  if [[ -f "/opt/novel-agent/backups/$BACKUP_NAME" ]]; then
    BACKUP="/opt/novel-agent/backups/$BACKUP_NAME"
  elif [[ -f "/tmp/$BACKUP_NAME" ]]; then
    BACKUP="/tmp/$BACKUP_NAME"
  fi
fi
if [[ -z "\$BACKUP" && -f "/tmp/deploy-fast-${COMPOSE_SVC}-bak.jar" ]]; then
  BACKUP="/tmp/deploy-fast-${COMPOSE_SVC}-bak.jar"
fi
if [[ -z "\$BACKUP" ]]; then
  LATEST=\$(ls -1t /opt/novel-agent/backups/${COMPOSE_SVC}-*.jar 2>/dev/null | head -1 || true)
  BACKUP="\$LATEST"
fi
if [[ -z "\$BACKUP" || ! -f "\$BACKUP" ]]; then
  echo "[rollback] 找不到可用备份（/tmp/deploy-fast-${COMPOSE_SVC}-bak.jar 或 /opt/novel-agent/backups/）"
  exit 1
fi
echo "[rollback] 使用备份: \$BACKUP"
docker cp "\$BACKUP" "\$CID:/app/app.jar"
docker restart "\$CID"
sleep 8
HEALTH_URL=""
case '$COMPOSE_SVC' in
  agent-gateway) HEALTH_URL="http://127.0.0.1:8080/actuator/health" ;;
  agent-auth)    HEALTH_URL="http://127.0.0.1:8081/actuator/health" ;;
  agent-pyai)    HEALTH_URL="http://127.0.0.1:8082/actuator/health" ;;
  agent-content) HEALTH_URL="http://127.0.0.1:8091/actuator/health" ;;
  agent-consumer) HEALTH_URL="http://127.0.0.1:8092/actuator/health" ;;
esac
if [[ -n "\$HEALTH_URL" ]]; then
  code=\$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 3 "\$HEALTH_URL" || echo 000)
  echo "[rollback] health \$HEALTH_URL → HTTP \$code"
  if [[ "\$code" != "200" ]]; then
    echo "[rollback] WARN: health 未就绪，请手动检查日志"
    exit 1
  fi
fi
echo "[rollback] $COMPOSE_SVC 已回滚完成"
EOF
