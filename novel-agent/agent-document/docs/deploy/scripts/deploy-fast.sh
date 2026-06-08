#!/usr/bin/env bash
# 快速热更新（推荐日常改 Java/前端后用）
#
# 对比 deploy-one.sh：
#   - 不 rsync 全仓库（可 SKIP_BUILD 复用本地 jar）
#   - 不 docker compose down（不拖垮整栈）
#   - 不 Docker 内 Maven 全量编译（本地只编一个模块，docker cp + restart）
#
# 用法：
#   bash novel-agent/agent-document/docs/deploy/scripts/deploy-fast.sh gateway mw
#   bash novel-agent/agent-document/docs/deploy/scripts/deploy-fast.sh auth mw
#   bash novel-agent/agent-document/docs/deploy/scripts/deploy-fast.sh pyai worker
#   bash novel-agent/agent-document/docs/deploy/scripts/deploy-fast.sh content worker
#   bash novel-agent/agent-document/docs/deploy/scripts/deploy-fast.sh frontend worker
#
# 环境变量：
#   SKIP_BUILD=1  跳过 mvn，用已有 target/*.jar
#   SKIP_MVN=1    同 SKIP_BUILD
#   REMOTE_BUILD=1  本地无 Java17 时：scp 源码后在服务器 Docker Maven 编译（慢于本地 jar）
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
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
  COMPOSE_FILE="novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml"
  ENV_REL="novel-agent/agent-document/docs/deploy/docker/.env.mw"
else
  REMOTE_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"
  REMOTE_DIR="${WORKER_REMOTE_DIR:-/opt/novel-agent}"
  COMPOSE_FILE="novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml"
  ENV_REL="novel-agent/agent-document/docs/deploy/docker/.env.worker"
fi

case "$SERVICE" in
  gateway|gw) COMPOSE_SVC="agent-gateway"; MODULE="agent-gateway"; JAR="agent-gateway-1.0.0-SNAPSHOT.jar" ;;
  auth)       COMPOSE_SVC="agent-auth";    MODULE="agent-auth";    JAR="agent-auth-1.0.0-SNAPSHOT.jar" ;;
  pyai)       COMPOSE_SVC="agent-pyai";    MODULE="agent-pyai";    JAR="agent-pyai-1.0.0-SNAPSHOT.jar" ;;
  content)    COMPOSE_SVC="agent-content"; MODULE="agent-content"; JAR="agent-content-1.0.0-SNAPSHOT.jar" ;;
  consumer)   COMPOSE_SVC="agent-consumer"; MODULE="agent-consumer"; JAR="agent-consumer-1.0.0-SNAPSHOT.jar" ;;
  billing)    COMPOSE_SVC="agent-billing"; MODULE="agent-billing"; JAR="agent-billing-1.0.0-SNAPSHOT.jar" ;;
  frontend|fe)
    echo "[deploy-fast] 前端：本地 vite build → 覆盖 Worker nginx 静态文件"
    if [[ "$TARGET" != "worker" ]]; then
      echo "[deploy-fast] 前端只在 worker 上，请: deploy-fast.sh frontend worker"
      exit 1
    fi
    if [[ "${SKIP_FRONTEND_BUILD:-0}" != "1" ]]; then
      (
        cd "$REPO_ROOT/frontend"
        export VITE_SECURITY_AES="${VITE_SECURITY_AES:-true}"
        export VITE_ROUTE_OBFUSCATION="${VITE_ROUTE_OBFUSCATION:-true}"
        export VITE_FIELD_ENCRYPTION="${VITE_FIELD_ENCRYPTION:-true}"
        export VITE_SECURITY_ENCRYPT_STREAM="${VITE_SECURITY_ENCRYPT_STREAM:-true}"
        export VITE_CODE_OBFUSCATION="${VITE_CODE_OBFUSCATION:-true}"
        if [[ ! -d node_modules/javascript-obfuscator ]]; then
          echo "[deploy-fast] 安装前端依赖（含 javascript-obfuscator / terser）..."
          COREPACK_ENABLE_STRICT=0 pnpm install || npm install --legacy-peer-deps
        fi
        if ! pnpm run build 2>/dev/null; then
          echo "[deploy-fast] pnpm 不可用，回退 npx vite build"
          npx vite build
        fi
      )
    fi
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
    if [[ "${SKIP_CRYPTO_REGISTER:-0}" != "1" ]]; then
      echo "[crypto-register] 注册前端 crypto 密钥（Worker env + runtime.json）..."
      bash "$SCRIPT_DIR/register-frontend-crypto.sh" || {
        echo "[deploy-fast] WARN: crypto register 失败，可稍后手动运行 register-frontend-crypto.sh"
      }
    else
      echo "[deploy-fast] SKIP_CRYPTO_REGISTER=1，跳过 crypto register（由 ci-hot 统一执行）"
    fi
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

LOCAL_JAR="$REPO_ROOT/novel-agent/agent-service/$MODULE/target/$JAR"
REMOTE_JAR="/tmp/deploy-fast-${COMPOSE_SVC}-$$.jar"

if [[ "${REMOTE_BUILD:-0}" == "1" ]]; then
  echo "[deploy-fast] REMOTE_BUILD=1：同步源码并在 $TARGET 上 Docker Maven 编译 ..."
  if deploy_can_rsync "$REMOTE_SSH"; then
    rsync -az --exclude target \
      "$REPO_ROOT/novel-agent/agent-service/$MODULE" \
      "$REPO_ROOT/novel-agent/agent-service/pom.xml" \
      "$REPO_ROOT/novel-agent/agent-common" \
      "$REPO_ROOT/novel-agent/pom.xml" \
      -e "${DEPLOY_RSYNC_SSH:-ssh ${DEPLOY_SSH_OPTS:-}}" "$REMOTE_SSH:$REMOTE_DIR/novel-agent/"
  else
    deploy_scp -r \
      "$REPO_ROOT/novel-agent/agent-service/$MODULE" \
      "$REPO_ROOT/novel-agent/agent-service/pom.xml" \
      "$REPO_ROOT/novel-agent/agent-common" \
      "$REPO_ROOT/novel-agent/pom.xml" \
      "$REMOTE_SSH:$REMOTE_DIR/novel-agent/"
  fi
  deploy_ssh "$REMOTE_SSH" "bash '$REMOTE_DIR/novel-agent/agent-document/docs/deploy/scripts/_server-deploy.sh' '$TARGET' '$SERVICE'"
  exit 0
fi

if [[ "${SKIP_BUILD:-0}" != "1" && "${SKIP_MVN:-0}" != "1" ]]; then
  echo "[deploy-fast] 本地编译 $MODULE ..."
  if [[ "$MODULE" == "agent-auth" ]]; then
    bash "$SCRIPT_DIR/build-email-templates.sh"
  fi
  (cd "$REPO_ROOT/novel-agent" && mvn -q -pl ":$MODULE" -am package -DskipTests)
else
  echo "[deploy-fast] SKIP_BUILD=1，使用已有 jar"
fi

if [[ ! -f "$LOCAL_JAR" ]]; then
  echo "[deploy-fast] 找不到 $LOCAL_JAR"
  exit 1
fi

GIT_SHA="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"

echo "[deploy-fast] 上传 jar ($(du -h "$LOCAL_JAR" | cut -f1)) sha=$GIT_SHA ..."
deploy_scp "$LOCAL_JAR" "$REMOTE_SSH:$REMOTE_JAR"

echo "[deploy-fast] 热替换 $COMPOSE_SVC @ $TARGET（不 down 整栈）..."
deploy_ssh "$REMOTE_SSH" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
CID=\$(\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' ps -q '$COMPOSE_SVC')
if [[ "${WORKER_JAVA_RECREATE:-0}" == "1" && '$TARGET' == 'worker' ]]; then
  echo "[deploy-fast] WORKER_JAVA_RECREATE=1 → compose recreate $COMPOSE_SVC（应用新 env/mem_limit）"
  \$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' up -d --force-recreate --no-deps '$COMPOSE_SVC'
  CID=\$(\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' ps -q '$COMPOSE_SVC')
fi
if [[ -z "\$CID" ]]; then
  echo "[deploy-fast] 容器未运行，仅 up $COMPOSE_SVC"
  \$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' up -d '$COMPOSE_SVC'
  CID=\$(\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' ps -q '$COMPOSE_SVC')
fi
mkdir -p /opt/novel-agent/backups
if docker exec "\$CID" test -f /app/app.jar; then
  docker cp "\$CID:/app/app.jar" "/tmp/deploy-fast-${COMPOSE_SVC}-bak.jar" 2>/dev/null || true
  if [[ -f "/tmp/deploy-fast-${COMPOSE_SVC}-bak.jar" ]]; then
    cp "/tmp/deploy-fast-${COMPOSE_SVC}-bak.jar" "/opt/novel-agent/backups/${COMPOSE_SVC}-${GIT_SHA}-prev.jar" 2>/dev/null || true
  fi
fi
docker cp '$REMOTE_JAR' "\$CID:/app/app.jar"
cp '$REMOTE_JAR' "/opt/novel-agent/backups/${COMPOSE_SVC}-${GIT_SHA}.jar" 2>/dev/null || true
rm -f '$REMOTE_JAR'
docker restart "\$CID"
echo "[deploy-fast] 等待 $COMPOSE_SVC 启动..."
if [[ '$COMPOSE_SVC' == 'agent-content' ]]; then
  sleep 10
  max_attempts=120
  sleep_sec=2
else
  sleep 5
  max_attempts=45
  sleep_sec=2
fi
probe_ready() {
  case '$COMPOSE_SVC' in
    agent-auth)
      curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 \
        -X POST 'http://127.0.0.1:8081/api/auth/api/login' \
        -H 'Content-Type: application/json' \
        -d '{"username":"_probe","password":"_probe"}' 2>/dev/null || echo 000
      ;;
    agent-gateway)
      curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 \
        -X POST 'http://127.0.0.1:8080/api/auth/api/login' \
        -H 'Content-Type: application/json' \
        -d '{"username":"_probe","password":"_probe"}' 2>/dev/null || echo 000
      ;;
    agent-pyai)
      code=\$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 \
        'http://127.0.0.1:8082/actuator/health' 2>/dev/null || echo 000)
      if [[ "\$code" == "200" ]]; then echo 200; return; fi
      curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 \
        'http://127.0.0.1:8082/' 2>/dev/null || echo 000
      ;;
    agent-content)
      code=\$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 \
        'http://127.0.0.1:8091/actuator/health' 2>/dev/null || echo 000)
      if [[ "\$code" == "200" ]]; then echo 200; return; fi
      code=\$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 \
        'http://127.0.0.1:8091/api/content/auth/novels' 2>/dev/null || echo 000)
      # Phase C0 新路径；旧 jar 返回 404，有路由则 400/401/500 等
      if [[ "\$code" == "404" || "\$code" == "000" ]]; then
        echo 000
      else
        echo "\$code"
      fi
      ;;
    agent-consumer)
      curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 \
        'http://127.0.0.1:8090/' 2>/dev/null || echo 000
      ;;
    agent-billing)
      curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 \
        'http://127.0.0.1:8092/actuator/health' 2>/dev/null || echo 000
      ;;
    *)
      curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 \
        -X POST 'http://127.0.0.1:8080/api/auth/api/login' \
        -H 'Content-Type: application/json' \
        -d '{"username":"_probe","password":"_probe"}' 2>/dev/null || echo 000
      ;;
  esac
}
ok=0
for i in \$(seq 1 \$max_attempts); do
  code=\$(probe_ready)
  if [[ "\$code" =~ ^[0-9]{3}\$ && "\$code" != "000" ]]; then
    echo "[deploy-fast] $COMPOSE_SVC 就绪 (HTTP \$code, attempt \$i)"
    ok=1
    break
  fi
  sleep \$sleep_sec
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

if [[ "$COMPOSE_SVC" == "agent-auth" ]]; then
  echo "[deploy-fast] 同步邮箱验证密钥（Redis + MW .env.mw）..."
  bash "$SCRIPT_DIR/register-auth-secrets.sh" || echo "[deploy-fast] WARN: register-auth-secrets 失败"
fi

echo "[deploy-fast] 完成: $COMPOSE_SVC @ $TARGET"
