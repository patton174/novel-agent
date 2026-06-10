#!/usr/bin/env bash
# 本地触发单服务 CI 式部署（与 GitHub Actions 相同脚本）
# 用法: bash ci-deploy-service.sh gateway mw
#       bash ci-deploy-service.sh frontend worker
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CI_DIR="$SCRIPT_DIR/../ci"
SERVICE="${1:?gateway|auth|consumer|billing|content|pyai|frontend|python-ai}"
TARGET="${2:?mw|worker}"

case "$SERVICE" in
  gateway)  MODULE=agent-gateway ;;
  auth)     MODULE=agent-auth ;;
  consumer) MODULE=agent-consumer ;;
  billing)  MODULE=agent-billing ;;
  content)  MODULE=agent-content ;;
  pyai)     MODULE=agent-pyai ;;
  frontend)
    bash "$CI_DIR/build-frontend.sh"
    bash "$CI_DIR/deploy-frontend.sh"
    exit 0
    ;;
  python-ai)
    bash "$CI_DIR/build-python-ai.sh"
    bash "$CI_DIR/deploy-python-ai.sh"
    exit 0
    ;;
  *)
    echo "未知服务: $SERVICE"; exit 1
    ;;
esac

bash "$CI_DIR/build-java.sh" "$MODULE"
bash "$CI_DIR/deploy-java.sh" "$SERVICE" "$TARGET"
