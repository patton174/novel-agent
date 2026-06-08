#!/usr/bin/env bash
# PostgreSQL logical backup for novel_agent (MW cron or manual).
set -euo pipefail

STAMP=$(date +%F-%H%M)
BACKUP_DIR=${BACKUP_DIR:-/opt/novel-agent/backups/pg}
CONTAINER=${PG_CONTAINER:-novel-agent-postgres}
DB_USER=${DB_USERNAME:-postgres}
DB_NAME=${DB_NAME:-novel_agent}

mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/${DB_NAME}-${STAMP}.sql.gz"

echo "[backup-postgres] dumping ${DB_NAME} -> ${OUT}"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$OUT"

find "$BACKUP_DIR" -name '*.sql.gz' -mtime +30 -delete
echo "[backup-postgres] done ($(du -h "$OUT" | cut -f1))"
