#!/usr/bin/env bash
# 仅初始化部署配置（不上传、不 build）：生成 .env + 发布 Docker 版 Nacos
#
#   bash novel-agent/docs/deploy/scripts/setup-deploy-config.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/../docker" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
ENV_FILE="$DEPLOY_DIR/.env"
ENV_EXAMPLE="$DEPLOY_DIR/.env.example"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  echo "[setup] 已创建 $ENV_FILE（请确认 SSH 用户与密码）"
else
  echo "[setup] 已存在 $ENV_FILE，跳过复制"
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ ! -f "$REPO_ROOT/python-ai/.env" ]]; then
  if [[ -f "$REPO_ROOT/python-ai/.env.example" ]]; then
    cp "$REPO_ROOT/python-ai/.env.example" "$REPO_ROOT/python-ai/.env"
    echo "[setup] WARN: 已复制 python-ai/.env.example → python-ai/.env，请填入 LLM API Key"
  else
    echo "[setup] ERROR: 缺少 python-ai/.env"
    exit 1
  fi
else
  echo "[setup] python-ai/.env 已就绪"
fi

export NACOS_CONFIG_DIR="$DEPLOY_DIR/nacos"
echo "[setup] 发布 Docker 版 Nacos 配置 → $NACOS_SERVER_ADDR namespace=$NACOS_NAMESPACE"
python "$REPO_ROOT/novel-agent/scripts/publish_nacos_config.py"

echo ""
echo "[setup] 配置完成。下一步："
echo "  1. 确认 $ENV_FILE 中 DEPLOY_REMOTE（SSH 用户@主机）"
echo "  2. 本机可免密: ssh ${DEPLOY_REMOTE:-root@107.150.112.140}"
echo "  3. 一键部署: bash novel-agent/docs/deploy/scripts/deploy-remote.sh"
echo ""
echo "说明：部署脚本会自动 rsync 代码到 ${DEPLOY_REMOTE_DIR:-/opt/novel-agent}，无需事先手动上传。"
