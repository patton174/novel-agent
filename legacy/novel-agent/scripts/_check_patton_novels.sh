#!/usr/bin/env bash
ssh -o BatchMode=yes root@107.150.112.140 bash <<'REMOTE'
PG="docker exec 1Panel-postgresql-ow0K psql -U postgres -d novel_agent"
echo "=== patton174 novels ==="
$PG -c "SELECT n.id, n.title, n.created_at, (SELECT COUNT(*) FROM chapter c WHERE c.novel_id=n.id) AS chapters FROM novel n WHERE n.user_id=3 ORDER BY n.updated_at DESC;"
echo "=== patton174 chapters ==="
$PG -c "SELECT c.id, c.title, c.word_count, c.updated_at FROM chapter c JOIN novel n ON n.id=c.novel_id WHERE n.user_id=3 ORDER BY c.updated_at DESC;"
REMOTE
