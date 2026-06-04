#!/usr/bin/env bash
set -euo pipefail
cd /opt/novel-agent
CF=novel-agent/docs/deploy/docker/docker-compose.mw.yml
EF=novel-agent/docs/deploy/docker/.env.mw
docker compose -f "$CF" --env-file "$EF" down
docker compose -f "$CF" --env-file "$EF" up -d agent-auth
sleep 20
docker compose -f "$CF" --env-file "$EF" ps
CID=$(docker compose -f "$CF" --env-file "$EF" ps -q agent-auth)
echo "=== ENV ==="
docker inspect "$CID" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E 'SPRING_|NACOS_' || true
echo "=== LOGS ==="
docker logs "$CID" --tail 80 2>&1
