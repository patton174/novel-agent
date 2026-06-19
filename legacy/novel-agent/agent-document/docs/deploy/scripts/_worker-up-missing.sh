#!/usr/bin/env bash
# 启动 Worker 上缺失的服务：pyai / consumer / frontend
set -euo pipefail
DIR=/opt/novel-agent
CF=$DIR/legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml
EF=$DIR/legacy/novel-agent/agent-document/docs/deploy/docker/.env.worker
cd "$DIR"
COMPOSE="docker compose"

echo "[worker-up] build & up pyai consumer frontend ..."
$COMPOSE -f "$CF" --env-file "$EF" build agent-pyai agent-consumer frontend
$COMPOSE -f "$CF" --env-file "$EF" up -d agent-pyai agent-consumer frontend

echo "[worker-up] wait 30s ..."
sleep 30

echo "=== compose ps ==="
$COMPOSE -f "$CF" --env-file "$EF" ps -a

echo "=== failed logs ==="
for svc in agent-pyai agent-consumer frontend; do
  cid=$($COMPOSE -f "$CF" --env-file "$EF" ps -q "$svc" 2>/dev/null || true)
  if [[ -n "$cid" ]]; then
    st=$(docker inspect -f '{{.State.Status}} restarting={{.State.Restarting}} exit={{.State.ExitCode}}' "$cid" 2>/dev/null || echo unknown)
    echo "--- $svc: $st ---"
    if [[ "$st" == *restarting=true* ]] || [[ "$st" == *exited* ]]; then
      docker logs "$cid" --tail 25 2>&1
    fi
  fi
done
