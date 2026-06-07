#!/usr/bin/env bash
set -euo pipefail
cd /opt/novel-agent
CF=novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml
EF=novel-agent/agent-document/docs/deploy/docker/.env.worker
docker compose -f "$CF" --env-file "$EF" restart agent-content 2>/dev/null \
  || docker restart novel-agent-worker-agent-content-1
sleep 25
docker ps -a --filter name=agent-content
echo "=== LOGS (grep nacos/register) ==="
docker logs novel-agent-worker-agent-content-1 2>&1 | grep -iE 'nacos|register|9848|Started NovelAgent' | tail -20
