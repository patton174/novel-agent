#!/usr/bin/env bash
# 在 MW PostgreSQL 上应用 studio/worker V26（scheduled_job_run + scheduled_job_config），幂等。
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"
ci_require_deploy_env

WORKER_MIGRATION_DIR="$REPO_ROOT/novel-studio/studio-modules/studio-module-worker/src/main/resources/db/migration"
SCHEDULING_MIGRATION_DIR="$REPO_ROOT/novel-studio/studio-platform/studio-platform-scheduling/src/main/resources/db/migration"
FLYWAY_TABLE="flyway_schema_history_studio"
V26_RUN="$(ls -1 "$WORKER_MIGRATION_DIR"/V26__*.sql | head -1)"
V26_CFG="$(ls -1 "$SCHEDULING_MIGRATION_DIR"/V26__*.sql | head -1)"
[[ -f "$V26_RUN" && -f "$V26_CFG" ]] || { echo "[studio-migrate] missing V26 SQL"; exit 1; }

REMOTE="$(ci_remote mw)"
RDIR="$(ci_remote_dir mw)"
STAGE="$RDIR/$STAGING_DIR/pg-studio-migrate-$$"
RUNNER="$(mktemp)"
trap 'rm -f "$RUNNER"' EXIT

ci_setup_ssh

echo "[studio-migrate] → MW PostgreSQL (studio V26 scheduled jobs)"
deploy_ssh "$REMOTE" "mkdir -p '$STAGE'"
deploy_scp "$V26_RUN" "$REMOTE:$STAGE/v26_run.sql"
deploy_scp "$V26_CFG" "$REMOTE:$STAGE/v26_cfg.sql"

cat > "$RUNNER" <<'RUN'
set -euo pipefail
STAGE="${STAGE:?}"
FLYWAY_TABLE="${FLYWAY_TABLE:?}"

PG_CID="$(docker ps -q -f name=novel-studio-postgresql | head -1)"
if [[ -z "$PG_CID" ]]; then
  PG_CID="$(docker ps -q -f ancestor=postgres:18.4-alpine | head -1)"
fi
[[ -n "$PG_CID" ]] || { echo "[studio-migrate] ERROR: postgres container not found"; exit 1; }

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
  local script_name="$2"
  local desc="${script_name#*__}"
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

apply_table_if_needed() {
  local label="$1"
  local check_sql="$2"
  local file="$3"
  if schema_present "$check_sql"; then
    echo "[studio-migrate] ${label} skip (schema present)"
    return 0
  fi
  echo "[studio-migrate] applying ${label} ..."
  psql_exec -f - < "$file"
  echo "[studio-migrate] ${label} ok"
}

ensure_flyway_table
apply_table_if_needed "scheduled_job_run" "SELECT to_regclass('public.scheduled_job_run') IS NOT NULL" "$STAGE/v26_run.sql"
apply_table_if_needed "scheduled_job_config" "SELECT to_regclass('public.scheduled_job_config') IS NOT NULL" "$STAGE/v26_cfg.sql"
if ! flyway_has "26"; then
  record_flyway "26" "V26__scheduled_job_run.sql"
fi

for check in \
  "scheduled_job_run:SELECT to_regclass('public.scheduled_job_run') IS NOT NULL" \
  "scheduled_job_config:SELECT to_regclass('public.scheduled_job_config') IS NOT NULL"
do
  name="${check%%:*}"
  sql="${check#*:}"
  schema_present "$sql" || { echo "[studio-migrate] ERROR: ${name} missing"; exit 1; }
done

rm -rf "$STAGE"
echo "[studio-migrate] done"
RUN

deploy_scp "$RUNNER" "$REMOTE:$STAGE/run.sh"
deploy_ssh "$REMOTE" "STAGE='$STAGE' FLYWAY_TABLE='$FLYWAY_TABLE' bash '$STAGE/run.sh'"

echo "[studio-migrate] complete"
