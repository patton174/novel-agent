#!/usr/bin/env bash
# 触发 GitHub Actions 部署；无 gh 时回退本地 ci-deploy-service.sh
# 用法: bash trigger-ci-deploy.sh gateway
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE="${1:?gateway|auth|consumer|billing|content|pyai|frontend|python-ai}"

case "$SERVICE" in
  gateway|auth|consumer|billing) TARGET=mw ;;
  content|pyai|frontend|python-ai) TARGET=worker ;;
  *) echo "未知服务: $SERVICE"; exit 1 ;;
esac

WORKFLOW="deploy-${SERVICE}.yml"
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  echo "[trigger-ci] gh workflow run $WORKFLOW"
  gh workflow run "$WORKFLOW"
  echo "[trigger-ci] 已触发，查看: gh run list --workflow=$WORKFLOW --limit 3"
else
  echo "[trigger-ci] 无 gh，本地 ci-deploy-service.sh $SERVICE $TARGET"
  bash "$SCRIPT_DIR/ci-deploy-service.sh" "$SERVICE" "$TARGET"
fi
