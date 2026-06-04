#!/usr/bin/env bash
set -euo pipefail
cd /opt/novel-agent
CF=novel-agent/docs/deploy/docker/docker-compose.mw.yml
EF=novel-agent/docs/deploy/docker/.env.mw
docker compose -f "$CF" --env-file "$EF" up -d entry-nginx 2>&1
docker compose -f "$CF" --env-file "$EF" ps -a
docker logs $(docker compose -f "$CF" --env-file "$EF" ps -q entry-nginx 2>/dev/null) 2>&1 | tail -10
