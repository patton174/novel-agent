#!/usr/bin/env bash
echo "======== GATEWAY (last 80) ========"
docker logs novel-agent-mw-agent-gateway-1 --tail 80 2>&1

echo ""
echo "======== AUTH (last 80) ========"
docker logs novel-agent-mw-agent-auth-1 --tail 80 2>&1

echo ""
echo "======== ENTRY-NGINX (last 30) ========"
docker logs novel-agent-mw-entry-nginx-1 --tail 30 2>&1

echo ""
echo "======== curl register test ========"
curl -sv -X POST http://127.0.0.1:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"test503","password":"test123456","email":"t503@test.com"}' 2>&1 | tail -25
