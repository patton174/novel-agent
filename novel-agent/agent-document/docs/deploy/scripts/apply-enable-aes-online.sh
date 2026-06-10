#!/usr/bin/env bash
# 开启 AES 请求体加密：先部署前端 → 发布 Nacos → 重启 Gateway
#
#   bash novel-agent/agent-document/docs/deploy/scripts/apply-enable-aes-online.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../../.." && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$SCRIPT_DIR/../docker/.env.split}"
DEPLOY_DIR="$SCRIPT_DIR/../docker"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"
if [[ -f "$SPLIT_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$SPLIT_ENV"
fi

: "${MW_HOST:?}"
: "${WORKER_HOST:?}"
: "${NACOS_PASSWORD:?}"
: "${NACOS_NAMESPACE:?}"
: "${SPRING_DATASOURCE_PASSWORD:?}"
: "${SPRING_DATA_REDIS_PASSWORD:?}"
: "${SPRING_RABBITMQ_PASSWORD:?}"

MW_SSH="${MW_SSH:-root@${MW_HOST}}"
WORKER_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"
REMOTE_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"

echo "[aes] Step 1/3 — 部署带 AES 的前端 ..."
export VITE_SECURITY_AES=true
export SKIP_FRONTEND_BUILD="${SKIP_FRONTEND_BUILD:-0}"
bash "$SCRIPT_DIR/ci-deploy-service.sh" frontend worker

echo "[aes] Step 2/3 — 发布 Nacos（client-security.enabled + aes-required）..."
NACOS_RENDER="$DEPLOY_DIR/nacos-split-rendered-aes"
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
export NACOS_PASSWORD="${NACOS_PASSWORD:?}"
export NACOS_NAMESPACE="${NACOS_NAMESPACE:?}"
export NACOS_AUTH_IDENTITY_KEY="${NACOS_AUTH_IDENTITY_KEY:-root}"
export NACOS_AUTH_IDENTITY_VALUE="${NACOS_AUTH_IDENTITY_VALUE:?}"
python "$REPO_ROOT/novel-agent/scripts/publish_nacos_config.py"

echo "[aes] Step 3/3 — Nacos 已发布（Gateway @RefreshScope 热刷新，无需 restart）"
deploy_wait_http_port "$MW_SSH" 8080 "gateway" 45
echo "[aes] 完成。登录后 DevTools 应看到 Content-Type: application/vnd.novel-agent.enc+json"
