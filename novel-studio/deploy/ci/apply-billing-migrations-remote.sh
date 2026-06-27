#!/usr/bin/env bash
# 在 MW PostgreSQL 上应用 billing 增量迁移（V21–V28），幂等；schema 优先于 flyway 历史。
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"
ci_require_deploy_env

BILLING_MIGRATION_DIR="$REPO_ROOT/novel-studio/studio-modules/studio-module-billing/src/main/resources/db/migration"
FLYWAY_TABLE="flyway_schema_history_billing"
BILLING_VERSIONS=(21 22 23 24 25 26 27 28)

REMOTE="$(ci_remote mw)"
RDIR="$(ci_remote_dir mw)"
STAGE="$RDIR/$STAGING_DIR/pg-migrate-$$"
RUNNER="$(mktemp)"
trap 'rm -f "$RUNNER"' EXIT

ci_setup_ssh

echo "[migrate] → MW PostgreSQL (billing V21–V28)"
deploy_ssh "$REMOTE" "mkdir -p '$STAGE'"

for v in "${BILLING_VERSIONS[@]}"; do
  file="$(ls -1 "$BILLING_MIGRATION_DIR"/V${v}__*.sql 2>/dev/null | head -1 || true)"
  [[ -n "$file" && -f "$file" ]] || { echo "[migrate] missing V${v} SQL"; exit 1; }
  deploy_scp "$file" "$REMOTE:$STAGE/v${v}.sql"
done

cat > "$RUNNER" <<'RUN'
set -euo pipefail
STAGE="${STAGE:?}"
FLYWAY_TABLE="${FLYWAY_TABLE:?}"

PG_CID="$(docker ps -q -f name=novel-studio-postgresql | head -1)"
if [[ -z "$PG_CID" ]]; then
  PG_CID="$(docker ps -q -f ancestor=postgres:18.4-alpine | head -1)"
fi
[[ -n "$PG_CID" ]] || { echo "[migrate] ERROR: postgres container not found"; exit 1; }

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
      echo "[migrate] V${version} skip (schema + flyway ok)"
    else
      echo "[migrate] V${version} skip (schema present, backfill flyway)"
      record_flyway "$version" "$file"
    fi
    return 0
  fi
  if flyway_has "$version"; then
    echo "[migrate] V${version} repair (flyway recorded, schema missing) ..."
  else
    echo "[migrate] applying V${version} ..."
  fi
  psql_exec -f - < "$file"
  record_flyway "$version" "$file"
  echo "[migrate] V${version} ok"
}

apply_if_needed "21" "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usage_event' AND column_name='model_code')" "$STAGE/v21.sql"
apply_if_needed "22" "SELECT to_regclass('public.payment_order') IS NOT NULL" "$STAGE/v22.sql"
apply_if_needed "23" "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payment_order' AND column_name='plan_id')" "$STAGE/v23.sql"
apply_if_needed "24" "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_content' AND column_name='locale')" "$STAGE/v24.sql"
apply_if_needed "25" "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_danmaku' AND column_name='message_en')" "$STAGE/v25.sql"
apply_if_needed "26" "SELECT to_regclass('public.gift_campaign') IS NOT NULL" "$STAGE/v26.sql"
apply_if_needed "27" "SELECT to_regclass('public.referral_code') IS NOT NULL" "$STAGE/v27.sql"
apply_if_needed "28" "SELECT to_regclass('public.user_balance') IS NOT NULL" "$STAGE/v28.sql"

rm -rf "$STAGE"
echo "[migrate] done"
RUN

deploy_scp "$RUNNER" "$REMOTE:$STAGE/run.sh"
deploy_ssh "$REMOTE" "STAGE='$STAGE' FLYWAY_TABLE='$FLYWAY_TABLE' bash '$STAGE/run.sh'"

echo "[migrate] complete"
