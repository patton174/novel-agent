#!/usr/bin/env bash
set -eu
CN_DIR=/opt/novel-agent
CF=$CN_DIR/legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.cn.yml
ssh -o BatchMode=yes root@118.89.123.201 bash -s <<EOS
set -eu
cd $CN_DIR
COMPOSE="docker compose"
\$COMPOSE -f "$CF" build python-ai-cn
\$COMPOSE -f "$CF" up -d python-ai-cn
sleep 10
curl -sf http://10.66.0.1:8000/api/health && echo " python-ai-cn OK"
EOS
