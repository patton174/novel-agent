#!/usr/bin/env bash
# 在 MW PostgreSQL 上应用 billing V22–V23（payment_order / plan 绑定列），幂等。
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"
ci_require_deploy_env

BILLING_MIGRATION_DIR="$REPO_ROOT/novel-studio/studio-modules/studio-module-billing/src/main/resources/db/migration"
V22="$(ls -1 "$BILLING_MIGRATION_DIR"/V22__*.sql | head -1)"
V23="$(ls -1 "$BILLING_MIGRATION_DIR"/V23__*.sql | head -1)"
[[ -f "$V22" && -f "$V23" ]] || { echo "[migrate] missing V22/V23 SQL"; exit 1; }

REMOTE="$(ci_remote mw)"
RDIR="$(ci_remote_dir mw)"
STAGE="$RDIR/$STAGING_DIR/pg-migrate-$$"

ci_setup_ssh

echo "[migrate] → MW PostgreSQL (V22 payment_order, V23 plan link)"
deploy_ssh "$REMOTE" "mkdir -p '$STAGE'"
deploy_scp "$V22" "$REMOTE:$STAGE/v22.sql"
deploy_scp "$V23" "$REMOTE:$STAGE/v23.sql"

deploy_ssh "$REMOTE" bash -s <<EOF
set -euo pipefail
STAGE='$STAGE'

PG_CID="\$(docker ps -q -f name=novel-studio-postgresql | head -1)"
if [[ -z "\$PG_CID" ]]; then
  PG_CID="\$(docker ps -q -f ancestor=postgres:18.4-alpine | head -1)"
fi
[[ -n "\$PG_CID" ]] || { echo "[migrate] ERROR: postgres container not found"; exit 1; }

psql_exec() {
  docker exec -i "\$PG_CID" psql -v ON_ERROR_STOP=1 -U postgres -d novel_agent "\$@"
}

apply_if_needed() {
  local version="\$1"
  local check_sql="\$2"
  local file="\$3"
  if psql_exec -tAc "\$check_sql" | grep -q '^t\$'; then
    echo "[migrate] V\${version} skip (already applied)"
    return 0
  fi
  echo "[migrate] applying V\${version} ..."
  psql_exec -f - < "\$file"
  local desc
  desc="\$(basename "\$file")"
  desc="\${desc#*__}"
  desc="\${desc%.sql}"
  psql_exec <<PSQL
INSERT INTO flyway_schema_history_studio
  (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success)
SELECT
  COALESCE((SELECT MAX(installed_rank) FROM flyway_schema_history_studio), 0) + 1,
  '\${version}',
  '\${desc}',
  'SQL',
  '\$(basename "\$file")',
  NULL,
  'deploy_ci',
  NOW(),
  0,
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM flyway_schema_history_studio WHERE version = '\${version}' AND success = TRUE
);
PSQL
  echo "[migrate] V\${version} ok"
}

psql_exec -tAc "SELECT to_regclass('public.flyway_schema_history_studio')" | grep -q flyway_schema_history_studio \
  || psql_exec <<'PSQL'
CREATE TABLE IF NOT EXISTS flyway_schema_history_studio (
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
);
PSQL

apply_if_needed "22" "SELECT to_regclass('public.payment_order') IS NOT NULL" "\$STAGE/v22.sql"
apply_if_needed "23" "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payment_order' AND column_name='plan_id')" "\$STAGE/v23.sql"

rm -rf "\$STAGE"
echo "[migrate] done"
EOF

echo "[migrate] complete"
