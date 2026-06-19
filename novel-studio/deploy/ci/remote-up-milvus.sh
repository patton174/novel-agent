#!/usr/bin/env bash
set -euo pipefail
cd /opt/novel-agent/novel-studio/deploy/docker
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
sysctl -w vm.max_map_count=262144 >/dev/null 2>&1 || true
$COMPOSE -f docker-compose.milvus.yml --env-file .env.mw down || true
$COMPOSE -f docker-compose.milvus.yml --env-file .env.mw pull
$COMPOSE -f docker-compose.milvus.yml --env-file .env.mw up -d
echo "waiting milvus health..."
for i in $(seq 1 40); do
  if curl -sf http://127.0.0.1:9091/healthz >/dev/null 2>&1; then
    echo "MILVUS_HEALTHY"
    break
  fi
  sleep 10
  if [[ "$i" -eq 40 ]]; then
    echo "MILVUS_TIMEOUT"
    $COMPOSE -f docker-compose.milvus.yml ps
    docker logs novel-studio-milvus --tail 30 || true
    exit 1
  fi
done
$COMPOSE -f docker-compose.milvus.yml ps
