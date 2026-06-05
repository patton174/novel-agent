#!/usr/bin/env bash
# 路由脱敏 v2 分步部署（每步独立，可 SKIP_*=1 跳过）
#
#   bash novel-agent/docs/deploy/scripts/deploy-route-v2.sh auth
#   bash novel-agent/docs/deploy/scripts/deploy-route-v2.sh gateway
#   bash novel-agent/docs/deploy/scripts/deploy-route-v2.sh frontend
#   bash novel-agent/docs/deploy/scripts/deploy-route-v2.sh register
#   bash novel-agent/docs/deploy/scripts/deploy-route-v2.sh all
#
# nginx /g/ 需一次性手动配置，见 novel-agent/docs/deploy/scripts/patch-nginx-g-location.sh
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

STEP="${1:-all}"
export VITE_SECURITY_AES="${VITE_SECURITY_AES:-true}"
export VITE_ROUTE_OBFUSCATION="${VITE_ROUTE_OBFUSCATION:-true}"
export VITE_FIELD_ENCRYPTION="${VITE_FIELD_ENCRYPTION:-true}"
export AGENT_INTERNAL_SERVICE_KEY="${AGENT_INTERNAL_SERVICE_KEY:-${INTERNAL_SERVICE_KEY:-}}"

do_auth() {
  [[ "${SKIP_AUTH:-0}" == "1" ]] && return 0
  echo "[v2] auth ..."
  bash "$SCRIPT_DIR/deploy-fast.sh" auth mw
}

do_gateway() {
  [[ "${SKIP_GATEWAY:-0}" == "1" ]] && return 0
  echo "[v2] gateway ..."
  bash "$SCRIPT_DIR/deploy-fast.sh" gateway mw
}

do_frontend() {
  [[ "${SKIP_FRONTEND:-0}" == "1" ]] && return 0
  echo "[v2] frontend ..."
  bash "$SCRIPT_DIR/deploy-fast.sh" frontend worker
}

do_register() {
  [[ "${SKIP_REGISTER:-0}" == "1" ]] && return 0
  echo "[v2] register ..."
  bash "$SCRIPT_DIR/register-frontend-crypto.sh"
}

case "$STEP" in
  auth) do_auth ;;
  gateway) do_gateway ;;
  frontend) do_frontend ;;
  register) do_register ;;
  all)
    do_auth
    do_gateway
    do_frontend
    do_register
    echo "[v2] 代码+runtime 完成。若 /g/ 仍 404：bash patch-nginx-g-location.sh"
    ;;
  *) echo "用法: deploy-route-v2.sh {auth|gateway|frontend|register|all}"; exit 1 ;;
esac

echo "[v2] done: $STEP"
