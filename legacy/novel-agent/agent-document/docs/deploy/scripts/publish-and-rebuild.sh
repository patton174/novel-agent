#!/usr/bin/env bash
# 本地一键：发布 Nacos + 远程重建 auth/gateway/frontend
# 用法：bash legacy/novel-agent/agent-document/docs/deploy/scripts/publish-and-rebuild.sh
#
# 需配置 legacy/novel-agent/agent-document/docs/deploy/docker/.env.split
# Java/前端通过 ci/ 脚本本地构建后部署（不在服务器 Maven 编译）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../../.." && pwd)"
DEPLOY_DIR="$SCRIPT_DIR/../docker"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$DEPLOY_DIR/.env.split}"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"
set -a
# shellcheck disable=SC1090
source "$SPLIT_ENV"
set +a

: "${MW_HOST:?MW_HOST}"
: "${WORKER_HOST:?WORKER_HOST}"
: "${NACOS_PASSWORD:?NACOS_PASSWORD}"
: "${NACOS_NAMESPACE:?NACOS_NAMESPACE}"
: "${SPRING_DATASOURCE_PASSWORD:?SPRING_DATASOURCE_PASSWORD}"
: "${SPRING_DATA_REDIS_PASSWORD:?SPRING_DATA_REDIS_PASSWORD}"
: "${SPRING_RABBITMQ_PASSWORD:?SPRING_RABBITMQ_PASSWORD}"

echo "=== [1/6] ensure internal service key ==="
bash "$SCRIPT_DIR/ensure-internal-service-key.sh"

echo "=== [2/6] render + publish Nacos ==="
NACOS_RENDER="$DEPLOY_DIR/nacos-split-rendered-0e"
rm -rf "$NACOS_RENDER" && mkdir -p "$NACOS_RENDER"
for f in "$DEPLOY_DIR/nacos-split"/*.yaml; do
  sed -e "s/WORKER_HOST_PLACEHOLDER/${WORKER_HOST}/g" \
      -e "s/YOUR_MW_HOST/${MW_HOST}/g" \
      -e "s|YOUR_DB_PASSWORD|${SPRING_DATASOURCE_PASSWORD}|g" \
      -e "s|YOUR_REDIS_PASSWORD|${SPRING_DATA_REDIS_PASSWORD}|g" \
      -e "s|YOUR_RMQ_PASSWORD|${SPRING_RABBITMQ_PASSWORD}|g" \
      "$f" > "$NACOS_RENDER/$(basename "$f")"
done
export NACOS_CONFIG_DIR="$NACOS_RENDER"
export NACOS_SERVER_ADDR="${NACOS_SERVER_ADDR:-${MW_HOST}:8848}"
export NACOS_USERNAME="${NACOS_USERNAME:-nacos}"
export NACOS_AUTH_IDENTITY_KEY="${NACOS_AUTH_IDENTITY_KEY:-root}"
export NACOS_AUTH_IDENTITY_VALUE="${NACOS_AUTH_IDENTITY_VALUE:?NACOS_AUTH_IDENTITY_VALUE}"
export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-dev}"
python "$REPO_ROOT/legacy/novel-agent/scripts/publish_nacos_config.py"

export VITE_SECURITY_AES=true
export VITE_ROUTE_OBFUSCATION=true
export VITE_FIELD_ENCRYPTION=true
echo "=== [3/6] rebuild + deploy auth @ mw ==="
bash "$SCRIPT_DIR/ci-deploy-service.sh" auth mw

echo "=== [4/6] rebuild + deploy gateway @ mw ==="
bash "$SCRIPT_DIR/ci-deploy-service.sh" gateway mw

echo "=== [5/6] rebuild + deploy frontend @ worker ==="
bash "$SCRIPT_DIR/ci-deploy-service.sh" frontend worker

echo "=== [6/6] register frontend crypto ==="
bash "$SCRIPT_DIR/register-frontend-crypto.sh"

echo "=== DONE: Nacos published + auth/gateway/frontend redeployed ==="
