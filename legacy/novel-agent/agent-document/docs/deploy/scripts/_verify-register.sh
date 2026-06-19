#!/usr/bin/env bash
curl -s -X POST http://127.0.0.1:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"vfix","password":"test123456","email":"vfix@test.com"}' \
  -w '\nHTTP:%{http_code}\n'
docker ps --filter name=gateway --format '{{.Names}} {{.Status}}'
