#!/usr/bin/env bash
# Restore novel_agent from a gzip pg_dump. Usage: restore-postgres.sh /path/to/backup.sql.gz
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup.sql.gz>" >&2
  exit 1
fi

BACKUP_FILE=$1
CONTAINER=${PG_CONTAINER:-novel-agent-postgres}
DB_USER=${DB_USERNAME:-postgres}
DB_NAME=${DB_NAME:-novel_agent}

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup not found: $BACKUP_FILE" >&2
  exit 1
fi

echo "[restore-postgres] dropping and recreating ${DB_NAME}"
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS ${DB_NAME};
CREATE DATABASE ${DB_NAME};
SQL

echo "[restore-postgres] restoring from ${BACKUP_FILE}"
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1
echo "[restore-postgres] done"
