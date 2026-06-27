#!/usr/bin/env bash
# 在 MW PostgreSQL 上应用 notification V28（user_notification），幂等。
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"
ci_require_deploy_env

NOTIFICATION_MIGRATION_DIR="$REPO_ROOT/novel-studio/studio-modules/studio-module-notification/src/main/resources/db/migration"
FLYWAY_TABLE="flyway_schema_history_notification"
V28="$(ls -1 "$NOTIFICATION_MIGRATION_DIR"/V28__*.sql | head -1)"
[[ -f "$V28" ]] || { echo "[notification-migrate] missing V28 SQL"; exit 1; }

REMOTE="$(ci_remote mw)"
RDIR="$(ci_remote_dir mw)"
STAGE="$RDIR/$STAGING_DIR/pg-notification-migrate-$$"
RUNNER="$(mktemp)"
trap 'rm -f "$RUNNER"' EXIT

ci_setup_ssh

echo "[notification-migrate] → MW PostgreSQL (notification V28)"
deploy_ssh "$REMOTE" "mkdir -p '$STAGE'"
deploy_scp "$V28" "$REMOTE:$STAGE/v28.sql"

cat > "$RUNNER" <<'RUN'
set -euo pipefail
STAGE="${STAGE:?}"
FLYWAY_TABLE="${FLYWAY_TABLE:?}"

PG_CID="$(docker ps -q -f name=novel-studio-postgresql | head -1)"
if [[ -z "$PG_CID" ]]; then
  PG_CID="$(docker ps -q -f ancestor=postgres:18.4-alpine | head -1)"
fi
[[ -n "$PG_CID" ]] || { echo "[notification-migrate] ERROR: postgres container not found"; exit 1; }

psql_exec() {
  docker exec -i "$PG_CID" psql -v ON_ERROR_STOP=1 -U postgres -d novel_agent "$@"
}

ensure_flyway_table() {
  psql_exec -tAc "SELECT to_regclass('public.${FLYWAY_TABLE}')" | grep -q "${FLYWAY_TABLE}" || psql_exec -c "
CREATE TABLE IF NOT EXISTS ${FLYWAY_TABLE} (
    installed_rank INTEGER NOT NULL PRIMARY KEY,
    version VARCHAR(50),
    description VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL,
    script VARCHAR(1000) NOT NULL,
    checksum INTEGER,
    installed_by VARCHAR(100) NOT NULL,
    installed_on TIMESTAMP NOT NULL DEFAULT NOW(),
    execution_time INTEGER NOT NULL,
    success BOOLEAN NOT NULL
);"
}

flyway_has() {
  local version="$1"
  psql_exec -tAc "SELECT 1 FROM ${FLYWAY_TABLE} WHERE version = '${version}' AND success = TRUE LIMIT 1" | grep -q 1
}

record_flyway() {
  local version="$1"
  local file="$2"
  local desc script_name
  script_name="$(basename "$file")"
  desc="${script_name#*__}"
  desc="${desc%.sql}"
  psql_exec -c "
INSERT INTO ${FLYWAY_TABLE}
  (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success)
SELECT
  COALESCE((SELECT MAX(installed_rank) FROM ${FLYWAY_TABLE}), 0) + 1,
  '${version}',
  '${desc}',
  'SQL',
  '${script_name}',
  NULL,
  'deploy_ci',
  NOW(),
  0,
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM ${FLYWAY_TABLE} WHERE version = '${version}' AND success = TRUE
);"
}

schema_present() {
  psql_exec -tAc "$1" | grep -q '^t$'
}

apply_if_needed() {
  local version="$1"
  local check_sql="$2"
  local file="$3"
  ensure_flyway_table
  if schema_present "$check_sql"; then
    if flyway_has "$version"; then
      echo "[notification-migrate] V${version} skip (schema + flyway ok)"
    else
      echo "[notification-migrate] V${version} skip (schema present, backfill flyway)"
      record_flyway "$version" "$file"
    fi
    return 0
  fi
  if flyway_has "$version"; then
    echo "[notification-migrate] V${version} repair (flyway recorded, schema missing) ..."
  else
    echo "[notification-migrate] applying V${version} ..."
  fi
  psql_exec -f - < "$file"
  record_flyway "$version" "$file"
  echo "[notification-migrate] V${version} ok"
}

apply_if_needed "28" "SELECT to_regclass('public.user_notification') IS NOT NULL" "$STAGE/v28.sql"
schema_present "SELECT to_regclass('public.user_notification') IS NOT NULL" || { echo "[notification-migrate] ERROR: user_notification missing"; exit 1; }

rm -rf "$STAGE"
echo "[notification-migrate] done"
RUN

deploy_scp "$RUNNER" "$REMOTE:$STAGE/run.sh"
deploy_ssh "$REMOTE" "STAGE='$STAGE' FLYWAY_TABLE='$FLYWAY_TABLE' bash '$STAGE/run.sh'"

echo "[notification-migrate] complete"
