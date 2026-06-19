#!/usr/bin/env bash
set -euo pipefail
GW="${1:-http://127.0.0.1:8080}"
USER="${2:-testauth401}"
PASS="${3:-Test123456}"
EMAIL="${4:-test401@test.com}"

echo "=== register (ignore if exists) ==="
curl -s -X POST "$GW/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\",\"email\":\"$EMAIL\"}" || true
echo

echo "=== login ==="
LOGIN=$(curl -s -X POST "$GW/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}")
echo "$LOGIN"
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || true)
if [[ -z "$TOKEN" ]]; then
  echo "NO TOKEN"
  exit 1
fi

echo "=== POST novels without token ==="
curl -s -o /dev/null -w "status=%{http_code}\n" -X POST "$GW/api/content/novels" \
  -H 'Content-Type: application/json' \
  -d '{"title":"test"}'

echo "=== POST novels with token ==="
curl -s -w "\nstatus=%{http_code}\n" -X POST "$GW/api/content/novels" \
  -H 'Content-Type: application/json' \
  -H "Authorization: $TOKEN" \
  -d '{"title":"test novel","genre":"玄幻"}'

echo "=== GET novels with token ==="
curl -s -w "\nstatus=%{http_code}\n" "$GW/api/content/novels" \
  -H "Authorization: $TOKEN"
