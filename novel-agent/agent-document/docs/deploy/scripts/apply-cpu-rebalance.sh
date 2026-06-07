#!/usr/bin/env bash
# 应用 CPU  rebalance：MW 去掉 python-ai，Worker 双 python-ai
set -euo pipefail
MW=root@107.150.112.140
WK=root@47.80.80.224
DIR=/opt/novel-agent
CF_MW=$DIR/novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml
CF_WK=$DIR/novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml
ENV_MW=$DIR/novel-agent/agent-document/docs/deploy/docker/.env.mw
ENV_WK=$DIR/novel-agent/agent-document/docs/deploy/docker/.env.worker
NGINX=$DIR/novel-agent/agent-document/docs/deploy/docker/nginx-python-lb.conf

echo "=== MW: 停旧 python-ai，更新 python-lb ==="
ssh $MW bash -s <<EOF
set -euo pipefail
cd $DIR
docker rm -f novel-agent-mw-python-ai-1 2>/dev/null || true
COMPOSE="docker compose"
\$COMPOSE -f $CF_MW --env-file $ENV_MW up -d python-lb agent-auth agent-gateway 2>/dev/null || \
  \$COMPOSE -f $CF_MW --env-file $ENV_MW up -d python-lb
\$COMPOSE -f $CF_MW --env-file $ENV_MW ps
EOF

echo "=== Worker: 启动 python-ai 双实例 ==="
ssh $WK bash -s <<EOF
set -euo pipefail
cd $DIR
COMPOSE="docker compose"
\$COMPOSE -f $CF_WK --env-file $ENV_WK up -d python-ai python-ai-2
sleep 15
\$COMPOSE -f $CF_WK --env-file $ENV_WK ps --filter name=python-ai
EOF

echo "=== 验证 LB ==="
curl -sf "http://107.150.112.140:8000/api/health" && echo " LB OK" || echo " LB pending"
