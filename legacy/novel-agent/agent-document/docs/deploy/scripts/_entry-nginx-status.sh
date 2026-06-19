#!/usr/bin/env bash
cd /opt/novel-agent
docker compose -f legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml --env-file legacy/novel-agent/agent-document/docs/deploy/docker/.env.mw ps entry-nginx
docker logs novel-agent-mw-entry-nginx-1 --tail 5 2>&1
