#!/usr/bin/env bash
# 快速热更新（推荐日常改 Java/前端后用）
#
# 对比 deploy-one.sh：
#   - 不 rsync 全仓库（可 SKIP_BUILD 复用本地 jar）
#   - 不 docker compose down（不拖垮整栈）
#   - 不 Docker 内 Maven 全量编译（本地只编一个模块，docker cp + restart）
#
# 用法：
#   bash novel-agent/docs/deploy/scripts/deploy-fast.sh gateway mw
#   bash novel-agent/docs/deploy/scripts/deploy-fast.sh auth mw
#   bash novel-agent/docs/deploy/scripts/deploy-fast.sh pyai worker
#   bash novel-agent/docs/deploy/scripts/deploy-fast.sh content worker
#   bash novel-agent/docs/deploy/scripts/deploy-fast.sh frontend worker
#
# 环境变量：
#   SKIP_BUILD=1  跳过 mvn，用已有 target/*.jar
#   SKIP_MVN=1    同 SKIP_BUILD
#   REMOTE_BUILD=1  本地无 Java17 时：scp 源码后在服务器 Docker Maven 编译（慢于本地 jar）
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$SCRIPT_DIR/../docker/.env.split}"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"
if [[ -f "$SPLIT_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$SPLIT_ENV"
fi
: "${MW_HOST:?MW_HOST 未设置（.env.split 或环境变量）}"
: "${WORKER_HOST:?WORKER_HOST 未设置（.env.split 或环境变量）}"

SERVICE="${1:?用法: deploy-fast.sh <gateway|auth|pyai|content|frontend|compose服务名> <mw|worker>}"
TARGET="${2:?用法: deploy-fast.sh <service> <mw|worker>}"

if [[ "$TARGET" == "mw" ]]; then
  REMOTE_SSH="${MW_SSH:-root@${MW_HOST}}"
  REMOTE_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
  COMPOSE_FILE="novel-agent/docs/deploy/docker/docker-compose.mw.yml"
  ENV_REL="novel-agent/docs/deploy/docker/.env.mw"
else
  REMOTE_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"
  REMOTE_DIR="${WORKER_REMOTE_DIR:-/opt/novel-agent}"
  COMPOSE_FILE="novel-agent/docs/deploy/docker/docker-compose.worker.yml"
  ENV_REL="novel-agent/docs/deploy/docker/.env.worker"
fi

case "$SERVICE" in
  gateway|gw) COMPOSE_SVC="agent-gateway"; MODULE="agent-gateway"; JAR="agent-gateway-1.0.0-SNAPSHOT.jar" ;;
  auth)       COMPOSE_SVC="agent-auth";    MODULE="agent-auth";    JAR="agent-auth-1.0.0-SNAPSHOT.jar" ;;
  pyai)       COMPOSE_SVC="agent-pyai";    MODULE="agent-pyai";    JAR="agent-pyai-1.0.0-SNAPSHOT.jar" ;;
  content)    COMPOSE_SVC="agent-content"; MODULE="agent-content"; JAR="agent-content-1.0.0-SNAPSHOT.jar" ;;
  consumer)   COMPOSE_SVC="agent-consumer"; MODULE="agent-consumer"; JAR="agent-consumer-1.0.0-SNAPSHOT.jar" ;;
  frontend|fe)
    echo "[deploy-fast] 前端：本地 vite build → 覆盖 Worker nginx 静态文件"
    if [[ "$TARGET" != "worker" ]]; then
      echo "[deploy-fast] 前端只在 worker 上，请: deploy-fast.sh frontend worker"
      exit 1
    fi
    (cd "$REPO_ROOT/frontend" && pnpm run build)
    REMOTE_DIST="/tmp/novel-fe-dist-$$"
    deploy_sync_dir "$REPO_ROOT/frontend/dist/" "$REMOTE_SSH" "$REMOTE_DIST"
    deploy_ssh "$REMOTE_SSH" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
CID=\$(\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' ps -q frontend)
if [[ -z "\$CID" ]]; then
  echo "[deploy-fast] frontend 容器未运行，先 up -d frontend"
  \$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' up -d frontend
  CID=\$(\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' ps -q frontend)
fi
docker cp "$REMOTE_DIST/." "\$CID:/usr/share/nginx/html/"
rm -rf '$REMOTE_DIST'
docker restart "\$CID"
echo "[deploy-fast] 前端已更新，硬刷新浏览器"
EOF
    exit 0
    ;;
  novel-agent-*)
    COMPOSE_SVC="$SERVICE"
    MODULE="$SERVICE"
    JAR="${SERVICE}-1.0.0-SNAPSHOT.jar"
    ;;
  *)
    echo "[deploy-fast] 未知服务: $SERVICE"
    exit 1
    ;;
esac

LOCAL_JAR="$REPO_ROOT/novel-agent/$MODULE/target/$JAR"
REMOTE_JAR="/tmp/deploy-fast-${COMPOSE_SVC}-$$.jar"

if [[ "${REMOTE_BUILD:-0}" == "1" ]]; then
  echo "[deploy-fast] REMOTE_BUILD=1：同步源码并在 $TARGET 上 Docker Maven 编译 ..."
  if deploy_can_rsync "$REMOTE_SSH"; then
    rsync -az --exclude target "$REPO_ROOT/novel-agent/$MODULE" "$REPO_ROOT/novel-agent/agent-common" "$REPO_ROOT/novel-agent/pom.xml" \
      -e "${DEPLOY_RSYNC_SSH:-ssh ${DEPLOY_SSH_OPTS:-}}" "$REMOTE_SSH:$REMOTE_DIR/novel-agent/"
  else
    deploy_scp -r "$REPO_ROOT/novel-agent/$MODULE" "$REPO_ROOT/novel-agent/agent-common" "$REPO_ROOT/novel-agent/pom.xml" \
      "$REMOTE_SSH:$REMOTE_DIR/novel-agent/"
  fi
  deploy_ssh "$REMOTE_SSH" "bash '$REMOTE_DIR/novel-agent/docs/deploy/scripts/_server-deploy.sh' '$TARGET' '$SERVICE'"
  exit 0
fi

if [[ "${SKIP_BUILD:-0}" != "1" && "${SKIP_MVN:-0}" != "1" ]]; then
  echo "[deploy-fast] 本地编译 $MODULE ..."
  (cd "$REPO_ROOT/novel-agent" && mvn -q -pl "$MODULE" -am package -DskipTests)
else
  echo "[deploy-fast] SKIP_BUILD=1，使用已有 jar"
fi

if [[ ! -f "$LOCAL_JAR" ]]; then
  echo "[deploy-fast] 找不到 $LOCAL_JAR"
  exit 1
fi

echo "[deploy-fast] 上传 jar ($(du -h "$LOCAL_JAR" | cut -f1)) ..."
deploy_scp "$LOCAL_JAR" "$REMOTE_SSH:$REMOTE_JAR"

echo "[deploy-fast] 热替换 $COMPOSE_SVC @ $TARGET（不 down 整栈）..."
deploy_ssh "$REMOTE_SSH" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
CID=\$(\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' ps -q '$COMPOSE_SVC')
if [[ -z "\$CID" ]]; then
  echo "[deploy-fast] 容器未运行，仅 up $COMPOSE_SVC"
  \$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' up -d '$COMPOSE_SVC'
  CID=\$(\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' ps -q '$COMPOSE_SVC')
fi
if docker exec "\$CID" test -f /app/app.jar; then
  docker cp "\$CID:/app/app.jar" "/tmp/deploy-fast-${COMPOSE_SVC}-bak.jar" 2>/dev/null || true
fi
docker cp '$REMOTE_JAR' "\$CID:/app/app.jar"
rm -f '$REMOTE_JAR'
docker restart "\$CID"
echo "[deploy-fast] 等待 $COMPOSE_SVC 启动..."
sleep 5
PORT=8080
if [[ '$COMPOSE_SVC' == 'agent-auth' ]]; then PORT=8081; fi
ok=0
for i in \$(seq 1 45); do
  code=\$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 \
    -X POST "http://127.0.0.1:\${PORT}/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"username":"_probe","password":"_probe"}' 2>/dev/null || echo 000)
  if [[ "\$code" != "000" ]]; then
    echo "[deploy-fast] $COMPOSE_SVC 就绪 (HTTP \$code, attempt \$i)"
    ok=1
    break
  fi
  sleep 2
done
if [[ "\$ok" -ne 1 ]]; then
  echo "[deploy-fast] ERROR: $COMPOSE_SVC 启动超时，最近日志："
  docker logs "\$CID" --tail 80 2>&1 || true
  if [[ -f "/tmp/deploy-fast-${COMPOSE_SVC}-bak.jar" ]]; then
    echo "[deploy-fast] 回滚上一版 jar ..."
    docker cp "/tmp/deploy-fast-${COMPOSE_SVC}-bak.jar" "\$CID:/app/app.jar"
    docker restart "\$CID"
    sleep 15
  fi
  exit 1
fi
\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' ps '$COMPOSE_SVC'
docker logs "\$CID" --tail 8 2>&1
EOF

echo "[deploy-fast] 完成: $COMPOSE_SVC @ $TARGET"
