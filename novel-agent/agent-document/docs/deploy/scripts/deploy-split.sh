#!/usr/bin/env bash
# 双机分拆一键部署：先 Worker 后 MW
#
#   bash novel-agent/agent-document/docs/deploy/scripts/setup-split-config.sh
#   bash novel-agent/agent-document/docs/deploy/scripts/deploy-split.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/../docker" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../../.." && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$DEPLOY_DIR/.env.split}"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"

if [[ ! -f "$SPLIT_ENV" ]]; then
  echo "[split-deploy] ERROR: 先运行 setup-split-config.sh"
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$SPLIT_ENV"
set +a

if [[ "${WORKER_HOST:-}" == "CHANGE_ME_WORKER_IP" || -z "${WORKER_HOST:-}" ]]; then
  echo "[split-deploy] ERROR: WORKER_HOST 未配置"
  exit 1
fi

MW_SSH="${MW_SSH:-root@${MW_HOST:-107.150.112.140}}"
WORKER_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"
MW_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
WORKER_DIR="${WORKER_REMOTE_DIR:-/opt/novel-agent}"

COMPOSE_MW="novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml"
COMPOSE_WORKER="novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml"
ENV_MW_REL="novel-agent/agent-document/docs/deploy/docker/.env.mw"
ENV_WORKER_REL="novel-agent/agent-document/docs/deploy/docker/.env.worker"

if [[ ! -f "$DEPLOY_DIR/.env.mw" || ! -f "$DEPLOY_DIR/nginx-python-lb.conf" || ! -f "$DEPLOY_DIR/nginx-entry-mw.conf" ]]; then
  echo "[split-deploy] 缺少生成文件，先执行 setup-split-config.sh"
  bash "$SCRIPT_DIR/setup-split-config.sh"
fi

echo "[split-deploy] 1/3 同步代码 → Worker ($WORKER_SSH)..."
deploy_rsync_to "$REPO_ROOT" "$WORKER_SSH" "$WORKER_DIR"
deploy_scp_file "$DEPLOY_DIR/.env.worker" "$WORKER_SSH" "$WORKER_DIR/$ENV_WORKER_REL"
deploy_scp_file "$DEPLOY_DIR/nginx-frontend-worker.conf" "$WORKER_SSH" "$WORKER_DIR/novel-agent/agent-document/docs/deploy/docker/nginx-frontend-worker.conf"

echo "[split-deploy] 2/3 Worker build & up..."
deploy_compose_up "$WORKER_SSH" "$WORKER_DIR" "$COMPOSE_WORKER" "$ENV_WORKER_REL"

echo "[split-deploy] 3/3 同步代码 → MW ($MW_SSH)..."
deploy_rsync_to "$REPO_ROOT" "$MW_SSH" "$MW_DIR"
deploy_scp_file "$DEPLOY_DIR/.env.mw" "$MW_SSH" "$MW_DIR/$ENV_MW_REL"
deploy_scp_file "$DEPLOY_DIR/nginx-python-lb.conf" "$MW_SSH" "$MW_DIR/novel-agent/agent-document/docs/deploy/docker/nginx-python-lb.conf"
deploy_scp_file "$DEPLOY_DIR/nginx-entry-mw.conf" "$MW_SSH" "$MW_DIR/novel-agent/agent-document/docs/deploy/docker/nginx-entry-mw.conf"

echo "[split-deploy] MW build & up..."
deploy_compose_up "$MW_SSH" "$MW_DIR" "$COMPOSE_MW" "$ENV_MW_REL"

echo ""
echo "[split-deploy] OK"
echo "  前端:     http://${MW_HOST}/"
echo "  前端(Worker): http://${WORKER_HOST}:${FRONTEND_PORT:-3000}"
echo "  网关:     http://${MW_HOST}:${GATEWAY_PORT:-8080}"
echo "  Python LB: http://${MW_HOST}:${PYTHON_LB_PORT:-8000}"
echo "  PyAI:      http://${WORKER_HOST}:8082"
echo ""
echo "  Worker 日志: ssh $WORKER_SSH 'cd $WORKER_DIR && docker compose -f $COMPOSE_WORKER logs -f --tail=80'"
echo "  MW 日志:     ssh $MW_SSH 'cd $MW_DIR && docker compose -f $COMPOSE_MW logs -f --tail=80'"
