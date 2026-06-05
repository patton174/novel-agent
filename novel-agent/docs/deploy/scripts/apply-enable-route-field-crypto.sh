#!/usr/bin/env bash
# 开启 Phase 0e：路由脱敏 + 字段加密（需先 deploy gateway/auth + 发布 manifest）
#
#   bash novel-agent/docs/deploy/scripts/apply-enable-route-field-crypto.sh
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

: "${MW_HOST:?}"
: "${SPRING_DATA_REDIS_PASSWORD:?}"

echo "[0e] 1/4 — 生成 manifest ..."
python "$REPO_ROOT/novel-agent/scripts/generate_crypto_manifest.py"
export SPRING_DATA_REDIS_HOST="${MW_HOST}"
export SPRING_DATA_REDIS_PASSWORD="${SPRING_DATA_REDIS_PASSWORD}"
python "$REPO_ROOT/novel-agent/scripts/publish_crypto_manifest.py"

echo "[0e] 2/4 — 部署 gateway + auth ..."
bash "$SCRIPT_DIR/deploy-fast.sh" gateway mw
bash "$SCRIPT_DIR/deploy-fast.sh" auth mw

echo "[0e] 3/4 — 部署前端（VITE_ROUTE_OBFUSCATION=true VITE_FIELD_ENCRYPTION=true）..."
export VITE_SECURITY_AES=true
export VITE_ROUTE_OBFUSCATION=true
export VITE_FIELD_ENCRYPTION=true
bash "$SCRIPT_DIR/deploy-fast.sh" frontend worker

echo "[0e] 4/4 — 更新 Nacos flags（route-obfuscation + field-encryption）..."
echo "请手动将 nacos agent-gateway.yaml 中 route-obfuscation / field-encryption 设为 true 并 publish，或下次 split-setup 一并发布。"
echo "[0e] 完成。登录后 API 应走 /api/x/{token}，body 内层 __sec 字段加密。"
