#!/usr/bin/env bash
set -euo pipefail
DIR=/opt/novel-agent
CF_MW=$DIR/legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml
CF_WK=$DIR/legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml
ENV_MW=$DIR/legacy/novel-agent/agent-document/docs/deploy/docker/.env.mw
ENV_WK=$DIR/legacy/novel-agent/agent-document/docs/deploy/docker/.env.worker

echo "======== $(hostname) MW compose ps ========"
cd "$DIR"
docker compose -f "$CF_MW" --env-file "$ENV_MW" ps -a 2>/dev/null || true

echo ""
echo "======== docker ps (novel-agent) ========"
docker ps -a --filter name=novel-agent --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
