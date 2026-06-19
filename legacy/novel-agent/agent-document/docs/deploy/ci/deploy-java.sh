#!/usr/bin/env bash
# 上传 JAR → 服务器 docker build（仅 runtime 镜像）→ compose up 单服务
# 用法: bash deploy-java.sh gateway mw
#   gateway → agent-gateway / novel-agent/gateway:latest
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"
ci_require_deploy_env
# shellcheck source=/dev/null
source "$REPO_ROOT/legacy/novel-agent/agent-document/docs/deploy/scripts/_deploy-lib.sh" 2>/dev/null || true

SERVICE="${1:?服务名: gateway|auth|consumer|billing|content|pyai}"
TARGET="${2:?目标: mw|worker}"

case "$SERVICE" in
  gateway)  MODULE=agent-gateway;  COMPOSE_SVC=agent-gateway;  IMAGE=novel-agent/gateway:latest ;;
  auth)     MODULE=agent-auth;     COMPOSE_SVC=agent-auth;     IMAGE=novel-agent/auth:latest ;;
  consumer) MODULE=agent-consumer; COMPOSE_SVC=agent-consumer; IMAGE=novel-agent/consumer:latest ;;
  billing)  MODULE=agent-billing;  COMPOSE_SVC=agent-billing;  IMAGE=novel-agent/billing:latest ;;
  content)  MODULE=agent-content;  COMPOSE_SVC=agent-content;  IMAGE=novel-agent/content:latest ;;
  pyai)     MODULE=agent-pyai;     COMPOSE_SVC=agent-pyai;     IMAGE=novel-agent/pyai:latest ;;
  *) echo "未知服务: $SERVICE"; exit 1 ;;
esac

JAR_NAME="${MODULE}-1.0.0-SNAPSHOT.jar"
LOCAL_JAR="${LOCAL_JAR:-$REPO_ROOT/legacy/novel-agent/agent-service/$MODULE/target/$JAR_NAME}"
[[ -f "$LOCAL_JAR" ]] || { echo "缺少 $LOCAL_JAR，请先 build-java.sh"; exit 1; }

REMOTE="$(ci_remote "$TARGET")"
RDIR="$(ci_remote_dir "$TARGET")"
COMPOSE_FILE="$(ci_compose_file "$TARGET")"
ENV_FILE="$(ci_env_file "$TARGET")"
SHA="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo manual)"
STAGE="$RDIR/$STAGING_DIR/$SERVICE"

ci_setup_ssh

echo "[deploy-java] $SERVICE → $TARGET ($IMAGE) sha=$SHA"
deploy_ssh "$REMOTE" "mkdir -p '$STAGE' '$RDIR/backups'"
deploy_scp "$LOCAL_JAR" "$REMOTE:$STAGE/app.jar"
deploy_scp "$DEPLOY_DIR/Dockerfile.java.runtime" "$REMOTE:$STAGE/Dockerfile"
deploy_scp "$DEPLOY_DIR/$COMPOSE_FILE" "$REMOTE:$RDIR/$DOCKER_REL/$COMPOSE_FILE"

deploy_ssh "$REMOTE" bash -s <<EOF
set -euo pipefail
STAGE='$STAGE'
RDIR='$RDIR'
DOCKER_REL='$DOCKER_REL'
COMPOSE_FILE='$COMPOSE_FILE'
ENV_FILE='$ENV_FILE'
COMPOSE_SVC='$COMPOSE_SVC'
IMAGE='$IMAGE'
SHA='$SHA'
SERVICE='$SERVICE'

cd "\$STAGE"
docker build -f Dockerfile --build-arg JAR=app.jar -t "\$IMAGE" .

mkdir -p "\$RDIR/backups"
CID=\$(docker ps -q -f name="\${COMPOSE_SVC}" | head -1)
if [[ -n "\$CID" ]] && docker exec "\$CID" test -f /app/app.jar 2>/dev/null; then
  docker cp "\$CID:/app/app.jar" "\$RDIR/backups/\${SERVICE}-\${SHA}-prev.jar" 2>/dev/null || true
fi
cp app.jar "\$RDIR/backups/\${SERVICE}-\${SHA}.jar" 2>/dev/null || true

cd "\$RDIR/\$DOCKER_REL"
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
\$COMPOSE -f "\$COMPOSE_FILE" --env-file "\$ENV_FILE" up -d --no-deps --no-build "\$COMPOSE_SVC"
echo "[deploy-java] done \$COMPOSE_SVC"
\$COMPOSE -f "\$COMPOSE_FILE" --env-file "\$ENV_FILE" ps "\$COMPOSE_SVC"
if [[ '$COMPOSE_SVC' == 'agent-gateway' ]]; then
  \$COMPOSE -f "\$COMPOSE_FILE" --env-file "\$ENV_FILE" restart entry-nginx 2>/dev/null || true
  echo "[deploy-java] restarted entry-nginx (gateway IP may have changed)"
fi
EOF

if [[ "$SERVICE" == "auth" ]]; then
  bash "$REPO_ROOT/legacy/novel-agent/agent-document/docs/deploy/scripts/register-auth-secrets.sh" || true
fi

echo "[deploy-java] 完成: $SERVICE @ $TARGET"
