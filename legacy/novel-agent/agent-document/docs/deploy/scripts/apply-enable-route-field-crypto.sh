#!/usr/bin/env bash
# 开启 Phase 0e：路由脱敏 + 字段加密 + Worker bootstrap 密钥注册
#
#   bash legacy/novel-agent/agent-document/docs/deploy/scripts/apply-enable-route-field-crypto.sh
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

AGENT_INTERNAL_SERVICE_KEY="${AGENT_INTERNAL_SERVICE_KEY:-${INTERNAL_SERVICE_KEY:-}}"
if [[ -z "$AGENT_INTERNAL_SERVICE_KEY" ]]; then
  bash "$SCRIPT_DIR/ensure-internal-service-key.sh"
  # shellcheck disable=SC1090
  source "$SPLIT_ENV"
  AGENT_INTERNAL_SERVICE_KEY="${AGENT_INTERNAL_SERVICE_KEY:-${INTERNAL_SERVICE_KEY:-}}"
fi

echo "[0e] 0/5 — 同步 internal service key ..."
bash "$SCRIPT_DIR/ensure-internal-service-key.sh"

echo "[0e] 1/4 — 部署 gateway + auth ..."
bash "$SCRIPT_DIR/ci-deploy-service.sh" gateway mw
bash "$SCRIPT_DIR/ci-deploy-service.sh" auth mw

echo "[0e] 2/4 — 部署前端（VITE_ROUTE_OBFUSCATION=true VITE_FIELD_ENCRYPTION=true）..."
export VITE_SECURITY_AES=true
export VITE_ROUTE_OBFUSCATION=true
export VITE_FIELD_ENCRYPTION=true
bash "$SCRIPT_DIR/ci-deploy-service.sh" frontend worker

echo "[0e] 3/4 — 发布 Nacos（route-obfuscation + field-encryption=true）..."
NACOS_RENDER="$DEPLOY_DIR/nacos-split-rendered-0e"
rm -rf "$NACOS_RENDER" && mkdir -p "$NACOS_RENDER"
for f in "$DEPLOY_DIR/nacos-split"/*.yaml; do
  sed -e "s/WORKER_HOST_PLACEHOLDER/${WORKER_HOST}/g" \
      -e "s/YOUR_MW_HOST/${MW_HOST}/g" \
      -e "s|YOUR_DB_PASSWORD|${SPRING_DATASOURCE_PASSWORD}|g" \
      -e "s|YOUR_REDIS_PASSWORD|${SPRING_DATA_REDIS_PASSWORD}|g" \
      -e "s|YOUR_RMQ_PASSWORD|${SPRING_RABBITMQ_PASSWORD}|g" \
      -e 's/route-obfuscation: false/route-obfuscation: true/' \
      -e 's/field-encryption: false/field-encryption: true/' \
      "$f" > "$NACOS_RENDER/$(basename "$f")"
done
export NACOS_CONFIG_DIR="$NACOS_RENDER"
export NACOS_SERVER_ADDR="${NACOS_SERVER_ADDR:-${MW_HOST}:8848}"
export NACOS_USERNAME="${NACOS_USERNAME:-nacos}"
export NACOS_PASSWORD="${NACOS_PASSWORD:?}"
export NACOS_NAMESPACE="${NACOS_NAMESPACE:?}"
export NACOS_AUTH_IDENTITY_KEY="${NACOS_AUTH_IDENTITY_KEY:-root}"
export NACOS_AUTH_IDENTITY_VALUE="${NACOS_AUTH_IDENTITY_VALUE:?}"
export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-dev}"
python "$REPO_ROOT/legacy/novel-agent/scripts/publish_nacos_config.py"

echo "[0e] 4/4 — Nacos 已发布；Worker register 写入 crypto-runtime（含 apiPathPrefix）"
bash "$SCRIPT_DIR/install-crypto-register-cron.sh"
echo "[0e] 完成。密钥/manifest 轮换走 Redis 热读；Worker cron 只更新 Worker env + runtime.json。"
