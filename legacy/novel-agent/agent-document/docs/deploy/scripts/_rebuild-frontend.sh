#!/usr/bin/env bash
set -euo pipefail
cd /opt/novel-agent
CF=legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml
EF=legacy/novel-agent/agent-document/docs/deploy/docker/.env.worker
echo "=== rebuild frontend ==="
docker compose -f "$CF" --env-file "$EF" build frontend 2>&1 | tail -12
docker compose -f "$CF" --env-file "$EF" up -d frontend
echo "=== done ==="
docker compose -f "$CF" --env-file "$EF" ps frontend
