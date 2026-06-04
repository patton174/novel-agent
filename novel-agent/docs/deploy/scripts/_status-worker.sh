#!/usr/bin/env bash
set -euo pipefail
DIR=/opt/novel-agent
CF_WK=$DIR/novel-agent/docs/deploy/docker/docker-compose.worker.yml
ENV_WK=$DIR/novel-agent/docs/deploy/docker/.env.worker

echo "======== $(hostname) Worker compose ps ========"
cd "$DIR"
docker compose -f "$CF_WK" --env-file "$ENV_WK" ps -a 2>/dev/null || true

echo ""
echo "======== docker ps (novel-agent) ========"
docker ps -a --filter name=novel-agent --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
