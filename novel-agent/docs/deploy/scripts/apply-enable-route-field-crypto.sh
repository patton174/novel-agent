#!/usr/bin/env bash
# 开启 Phase 0e：路由脱敏 + 字段加密 + Worker bootstrap 密钥注册
#
#   bash novel-agent/docs/deploy/scripts/apply-enable-route-field-crypto.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
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

echo "[0e] 1/5 — 生成 manifest ..."
python "$REPO_ROOT/novel-agent/scripts/generate_crypto_manifest.py"

echo "[0e] 2/5 — 部署 gateway + auth ..."
bash "$SCRIPT_DIR/deploy-fast.sh" gateway mw
bash "$SCRIPT_DIR/deploy-fast.sh" auth mw

echo "[0e] 3/5 — 部署前端（VITE_ROUTE_OBFUSCATION=true VITE_FIELD_ENCRYPTION=true）..."
export VITE_SECURITY_AES=true
export VITE_ROUTE_OBFUSCATION=true
export VITE_FIELD_ENCRYPTION=true
bash "$SCRIPT_DIR/deploy-fast.sh" frontend worker

echo "[0e] 4/5 — 发布 Nacos（route-obfuscation + field-encryption=true）..."
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
python "$REPO_ROOT/novel-agent/scripts/publish_nacos_config.py"

echo "[0e] 5/5 — 重启 gateway 使 Nacos 生效 ..."
MW_SSH="${MW_SSH:-root@${MW_HOST}}"
REMOTE_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
COMPOSE_FILE="novel-agent/docs/deploy/docker/docker-compose.mw.yml"
ENV_REL="novel-agent/docs/deploy/docker/.env.mw"
deploy_ssh "$MW_SSH" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' restart agent-gateway
sleep 15
EOF

deploy_wait_http_port "$MW_SSH" 8080 "gateway" 45
bash "$SCRIPT_DIR/install-crypto-register-cron.sh"
echo "[0e] 完成。登录后 API 应走 /api/x/{token}，body 内层 __sec 字段加密。"
