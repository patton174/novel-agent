#!/usr/bin/env bash
set -euo pipefail
PG="docker exec 1Panel-postgresql-ow0K psql -U postgres -d novel_agent -t -A"
ssh -o BatchMode=yes root@107.150.112.140 bash <<'REMOTE'
set -euo pipefail
PG="docker exec 1Panel-postgresql-ow0K psql -U postgres -d novel_agent"
echo "=== auth_user ==="
$PG -c "SELECT id, username, email, role FROM auth_user ORDER BY id;"
echo "=== counts ==="
$PG -c "SELECT 'novel' AS tbl, COUNT(*) FROM novel UNION ALL SELECT 'chapter', COUNT(*) FROM chapter UNION ALL SELECT 'agent_session', COUNT(*) FROM agent_session;"
echo "=== novels by user ==="
$PG -c "SELECT user_id, COUNT(*) AS novels FROM novel GROUP BY user_id ORDER BY novels DESC LIMIT 10;"
echo "=== patton174 ==="
$PG -c "SELECT u.id, u.username, (SELECT COUNT(*) FROM novel n WHERE n.user_id=u.id) AS novels FROM auth_user u WHERE u.username='patton174';"
REMOTE
