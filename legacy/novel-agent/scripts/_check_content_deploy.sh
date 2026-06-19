#!/usr/bin/env bash
ssh -o BatchMode=yes root@47.80.80.224 bash <<'REMOTE'
echo "=== content container ==="
docker ps --filter name=agent-content --format '{{.Names}} {{.Status}}'
echo "=== jar age ==="
CID=$(docker ps -q --filter name=agent-content | head -1)
docker exec "$CID" ls -la /app/app.jar 2>/dev/null || true
echo "=== sample paths ==="
for p in \
  /api/content/auth/novels \
  /api/content/auth/dashboard/summary \
  /actuator/health \
  /actuator/mappings; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -H "X-User-Id: 3" "http://127.0.0.1:8091${p}")
  echo "$code $p"
done
echo "=== recent content logs ==="
docker logs --tail 15 "$CID" 2>&1
REMOTE
