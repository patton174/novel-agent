#!/usr/bin/env bash
# Phase 3 线上部署：本机编译 JAR + rsync + 热更新 Worker + Nacos queued 模式
#
#   bash novel-agent/agent-document/docs/deploy/scripts/deploy-phase3-online.sh
#   SKIP_RSYNC=1 bash novel-agent/agent-document/docs/deploy/scripts/deploy-phase3-online.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../../.." && pwd)"
export MW_HOST="${MW_HOST:-107.150.112.140}"
export WORKER_HOST="${WORKER_HOST:-47.80.80.224}"
WORKER_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"
WORKER_DIR="${WORKER_REMOTE_DIR:-/opt/novel-agent}"
SKIP_RSYNC="${SKIP_RSYNC:-0}"
JAVA_HOME="${JAVA_HOME:-/d/Programs/Java/jdk_21}"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"

if [[ "$SKIP_RSYNC" != "1" ]]; then
  echo "[phase3] rsync python-ai + novel-agent → Worker ..."
  deploy_ssh "$WORKER_SSH" "mkdir -p '$WORKER_DIR'"
  if command -v rsync >/dev/null 2>&1; then
    rsync -avz \
      --exclude '.git' --exclude 'node_modules' --exclude '**/target' \
      --exclude '.dev-logs' --exclude 'claude-code-ref' \
      -e "${DEPLOY_RSYNC_SSH:-ssh ${DEPLOY_SSH_OPTS:-}}" \
      "$REPO_ROOT/python-ai/" "$WORKER_SSH:$WORKER_DIR/python-ai/"
    rsync -avz \
      --exclude '.git' --exclude 'node_modules' --exclude '**/target' \
      -e "${DEPLOY_RSYNC_SSH:-ssh ${DEPLOY_SSH_OPTS:-}}" \
      "$REPO_ROOT/novel-agent/" "$WORKER_SSH:$WORKER_DIR/novel-agent/"
  else
    deploy_rsync_to "$REPO_ROOT" "$WORKER_SSH" "$WORKER_DIR"
  fi
else
  echo "[phase3] SKIP_RSYNC=1"
fi

echo "[phase3] 本机 Maven 编译 (content / pyai / consumer) ..."
(
  export JAVA_HOME
  export PATH="$JAVA_HOME/bin:$PATH"
  cd "$REPO_ROOT/novel-agent"
  mvn -q -pl agent-content,agent-pyai,agent-consumer -am package -DskipTests
)

echo "[phase3] 热更新 Java 服务 ..."
export SKIP_BUILD=1
bash "$SCRIPT_DIR/ci-deploy-service.sh" content worker
bash "$SCRIPT_DIR/ci-deploy-service.sh" pyai worker
bash "$SCRIPT_DIR/ci-deploy-service.sh" consumer mw

echo "[phase3] Nacos + python-ai 重建 ..."
deploy_scp_file "$SCRIPT_DIR/deploy-phase3-remote.sh" "$WORKER_SSH" "$WORKER_DIR/novel-agent/agent-document/docs/deploy/scripts/deploy-phase3-remote.sh"
deploy_ssh "$WORKER_SSH" "chmod +x '$WORKER_DIR/novel-agent/agent-document/docs/deploy/scripts/deploy-phase3-remote.sh' && bash '$WORKER_DIR/novel-agent/agent-document/docs/deploy/scripts/deploy-phase3-remote.sh'"

echo ""
echo "[phase3] 部署完成"
echo "  站点: https://www.novel-agent.cn"
echo "  PyAI 已切换 agent.runtime.mode=queued（Worker 接管 Run）"
echo "  日志: ssh $WORKER_SSH 'cd $WORKER_DIR && docker compose -f novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml logs -f --tail=100 agent-consumer agent-pyai python-ai'"
