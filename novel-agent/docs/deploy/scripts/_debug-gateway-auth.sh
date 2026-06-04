#!/usr/bin/env bash
echo "=== gateway -> auth DNS & curl ==="
docker exec novel-agent-mw-agent-gateway-1 sh -c 'getent hosts agent-auth 2>/dev/null || nslookup agent-auth 2>/dev/null; wget -qO- --timeout=3 http://agent-auth:8081/api/auth/register 2>&1 | head -3' || true

echo ""
echo "=== auth direct :8081 ==="
curl -sv -X POST http://127.0.0.1:8081/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"test503b","password":"test123456","email":"t503b@test.com"}' 2>&1 | tail -15

echo ""
echo "=== gateway recent errors ==="
docker logs novel-agent-mw-agent-gateway-1 2>&1 | grep -iE '503|error|auth|unavailable|failed|refused' | tail -20
