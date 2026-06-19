#!/usr/bin/env bash
# Worker 上执行：重新注册 crypto 并同步 frontend crypto-runtime.json
set -euo pipefail

KEY=""
if docker inspect novel-studio-worker-novel-studio-1 >/dev/null 2>&1; then
  KEY=$(docker inspect novel-studio-worker-novel-studio-1 --format '{{range .Config.Env}}{{println .}}{{end}}' \
    | grep '^AGENT_INTERNAL_SERVICE_KEY=' | head -1 | cut -d= -f2- || true)
fi
if [[ -z "$KEY" ]]; then
  for f in /opt/novel-agent/novel-studio/deploy/docker/.env.worker \
           /opt/novel-agent/legacy/novel-agent/agent-document/docs/deploy/docker/.env.worker; do
    if [[ -f "$f" ]]; then
      KEY=$(grep -E '^AGENT_INTERNAL_SERVICE_KEY=' "$f" | head -1 | cut -d= -f2- | tr -d '"' || true)
      [[ -n "$KEY" ]] && break
    fi
  done
fi
if [[ -z "$KEY" ]]; then
  echo "ERROR: AGENT_INTERNAL_SERVICE_KEY not found"
  exit 1
fi

echo "[fix-crypto] registering bootstrap..."
HTTP=$(curl -sS -o /tmp/crypto-runtime.json -w "%{http_code}" -X POST \
  "http://127.0.0.1:8080/internal/crypto/register-frontend-server" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Service-Key: ${KEY}" \
  -d '{"host":"worker","ttlSec":172800}')
if [[ "$HTTP" != "200" ]]; then
  echo "ERROR: register HTTP $HTTP"
  cat /tmp/crypto-runtime.json || true
  exit 1
fi
chmod 644 /tmp/crypto-runtime.json

CID=$(docker ps -qf 'name=frontend' | head -1)
if [[ -z "$CID" ]]; then
  echo "ERROR: frontend container not found"
  exit 1
fi

docker cp /tmp/crypto-runtime.json "${CID}:/usr/share/nginx/html/crypto-runtime.json"
docker exec "$CID" chmod 644 /usr/share/nginx/html/crypto-runtime.json
docker exec "$CID" rm -f /usr/share/nginx/html/crypto-manifest.json 2>/dev/null || true

echo "[fix-crypto] frontend runtime:"
docker exec "$CID" cat /usr/share/nginx/html/crypto-runtime.json
echo
echo "[fix-crypto] backend crypto-config:"
curl -sS http://127.0.0.1:8080/api/auth/crypto-config
echo
echo "[fix-crypto] done"
