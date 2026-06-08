#!/usr/bin/env bash
ssh -o BatchMode=yes root@47.80.80.224 bash <<'REMOTE'
echo "=== content API user_id=3 (patton174) ==="
curl -s -o /tmp/sum.json -w "summary HTTP:%{http_code}\n" -H "X-User-Id: 3" http://127.0.0.1:8091/api/content/auth/dashboard/summary
head -c 400 /tmp/sum.json; echo
curl -s -o /tmp/novels.json -w "novels HTTP:%{http_code}\n" -H "X-User-Id: 3" http://127.0.0.1:8091/api/content/auth/novels
head -c 400 /tmp/novels.json; echo
curl -s -o /tmp/recent.json -w "recent HTTP:%{http_code}\n" -H "X-User-Id: 3" http://127.0.0.1:8091/api/content/auth/dashboard/recent-novels
head -c 400 /tmp/recent.json; echo
REMOTE
