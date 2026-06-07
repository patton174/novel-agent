#!/usr/bin/env bash
# 一键远程 Docker 部署：同步代码 → 发布 Docker 版 Nacos 配置 → 远程 build & up
#
# 双机分拆请用 deploy-split.sh（见 .env.split.example）
#
# 用法（Git Bash）：
#   bash novel-agent/agent-document/docs/deploy/scripts/deploy-remote.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/../docker" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../../.." && pwd)"
ENV_FILE="${DEPLOY_ENV_FILE:-$DEPLOY_DIR/.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

REMOTE="${DEPLOY_REMOTE:?请在 .env 设置 DEPLOY_REMOTE}"
REMOTE_DIR="${DEPLOY_REMOTE_DIR:-/opt/novel-agent}"
COMPOSE_FILE="novel-agent/agent-document/docs/deploy/docker/docker-compose.yml"
ENV_REL="novel-agent/agent-document/docs/deploy/docker/.env"

echo "[deploy] repo=$REPO_ROOT"
echo "[deploy] remote=$REMOTE dir=$REMOTE_DIR"

if [[ ! -f "$REPO_ROOT/python-ai/.env" ]]; then
  echo "[deploy] WARN: python-ai/.env 不存在，请复制 python-ai/.env.example 并填入 LLM API Key"
  if [[ -f "$REPO_ROOT/python-ai/.env.example" ]]; then
    echo "         cp python-ai/.env.example python-ai/.env"
  fi
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[deploy] ERROR: 缺少 $ENV_FILE，请先 cp .env.example .env"
  exit 1
fi

echo "[deploy] 1/4 发布 Docker 版 Nacos 配置..."
export NACOS_CONFIG_DIR="$DEPLOY_DIR/nacos"
export NACOS_SERVER_ADDR="${NACOS_SERVER_ADDR:?请在 .env 设置 NACOS_SERVER_ADDR}"
export NACOS_USERNAME="${NACOS_USERNAME:-nacos}"
export NACOS_PASSWORD="${NACOS_PASSWORD:?请在 .env 设置 NACOS_PASSWORD}"
export NACOS_NAMESPACE="${NACOS_NAMESPACE:?请在 .env 设置 NACOS_NAMESPACE}"
export NACOS_AUTH_IDENTITY_KEY="${NACOS_AUTH_IDENTITY_KEY:-root}"
export NACOS_AUTH_IDENTITY_VALUE="${NACOS_AUTH_IDENTITY_VALUE:-}"
python "$REPO_ROOT/novel-agent/scripts/publish_nacos_config.py"

echo "[deploy] 2/4 同步代码到远程..."
deploy_rsync_to "$REPO_ROOT" "$REMOTE" "$REMOTE_DIR"

echo "[deploy] 3/4 上传 .env..."
deploy_scp_file "$ENV_FILE" "$REMOTE" "$REMOTE_DIR/$ENV_REL"

echo "[deploy] 4/4 远程 docker compose build & up..."
deploy_compose_up "$REMOTE" "$REMOTE_DIR" "$COMPOSE_FILE" "$ENV_REL"

HOST_IP="${HOST_IP:-107.150.112.140}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
GATEWAY_PORT="${GATEWAY_PORT:-8080}"

echo ""
echo "[deploy] OK"
echo "  前端:   http://${HOST_IP}:${FRONTEND_PORT}"
echo "  网关:   http://${HOST_IP}:${GATEWAY_PORT}"
echo "  Auth:   http://${HOST_IP}:8081"
echo "  日志:   ssh $REMOTE 'cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE logs -f --tail=100'"
echo "  重启:   ssh $REMOTE 'cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE --env-file $ENV_REL up -d --build'"
