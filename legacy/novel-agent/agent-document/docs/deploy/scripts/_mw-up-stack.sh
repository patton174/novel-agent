#!/usr/bin/env bash
set -euo pipefail
cd /opt/novel-agent
CF=legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml
EF=legacy/novel-agent/agent-document/docs/deploy/docker/.env.mw
docker compose -f "$CF" --env-file "$EF" up -d agent-auth entry-nginx python-lb
sleep 5
docker compose -f "$CF" --env-file "$EF" ps
