#!/usr/bin/env bash
set -euo pipefail
cd /opt/novel-agent
CF=legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml
EF=legacy/novel-agent/agent-document/docs/deploy/docker/.env.mw
echo "=== GatewayRoutesConfig on disk ==="
grep -A2 'class GatewayRoutesConfig' legacy/novel-agent/agent-service/agent-gateway/src/main/java/com/novelai/gateway/config/GatewayRoutesConfig.java || true

echo "=== rebuild gateway ==="
docker compose -f "$CF" --env-file "$EF" build --no-cache agent-gateway 2>&1 | tail -15

echo "=== restart gateway ==="
docker compose -f "$CF" --env-file "$EF" up -d agent-gateway entry-nginx
sleep 25

echo "=== test register ==="
curl -s -X POST http://127.0.0.1:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"rebuild1","password":"test123456","email":"rb1@test.com"}' \
  -w '\nHTTP:%{http_code}\n'

docker logs novel-agent-mw-agent-gateway-1 2>&1 | grep -iE '503|route|auth-route|error' | tail -10
