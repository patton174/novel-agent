#!/usr/bin/env bash
# 在 MW PostgreSQL 上应用 content V26–V30（agent_skill / profile / crew），幂等。
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"
ci_require_deploy_env

CONTENT_MIGRATION_DIR="$REPO_ROOT/novel-studio/studio-modules/studio-module-content/src/main/resources/db/migration"
FLYWAY_TABLE="flyway_schema_history_content"

REMOTE="$(ci_remote mw)"
RDIR="$(ci_remote_dir mw)"
STAGE="$RDIR/$STAGING_DIR/pg-content-migrate-$$"

ci_setup_ssh

echo "[content-migrate] → MW PostgreSQL (V26–V30 agent platform)"
deploy_ssh "$REMOTE" "mkdir -p '$STAGE'"

for v in 26 27 28 29 30; do
  file="$(ls -1 "$CONTENT_MIGRATION_DIR"/V${v}__*.sql 2>/dev/null | head -1 || true)"
  [[ -n "$file" && -f "$file" ]] || { echo "[content-migrate] missing V${v} SQL"; exit 1; }
  deploy_scp "$file" "$REMOTE:$STAGE/v${v}.sql"
done

deploy_ssh "$REMOTE" bash -s <<EOF
set -euo pipefail
STAGE='$STAGE'
FLYWAY_TABLE='$FLYWAY_TABLE'

PG_CID="\$(docker ps -q -f name=novel-studio-postgresql | head -1)"
if [[ -z "\$PG_CID" ]]; then
  PG_CID="\$(docker ps -q -f ancestor=postgres:18.4-alpine | head -1)"
fi
[[ -n "\$PG_CID" ]] || { echo "[content-migrate] ERROR: postgres container not found"; exit 1; }

psql_exec() {
  docker exec -i "\$PG_CID" psql -v ON_ERROR_STOP=1 -U postgres -d novel_agent "\$@"
}

ensure_flyway_table() {
  psql_exec -tAc "SELECT to_regclass('public.${FLYWAY_TABLE}')" | grep -q "${FLYWAY_TABLE}" || psql_exec <<'PSQL'
CREATE TABLE IF NOT EXISTS flyway_schema_history_content (
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
}

flyway_has() {
  local version="\$1"
  psql_exec -tAc "SELECT 1 FROM ${FLYWAY_TABLE} WHERE version = '\${version}' AND success = TRUE LIMIT 1" | grep -q 1
}

record_flyway() {
  local version="\$1"
  local file="\$2"
  local desc
  desc="\$(basename "\$file")"
  desc="\${desc#*__}"
  desc="\${desc%.sql}"
  psql_exec <<PSQL
INSERT INTO ${FLYWAY_TABLE}
  (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success)
SELECT
  COALESCE((SELECT MAX(installed_rank) FROM ${FLYWAY_TABLE}), 0) + 1,
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
  SELECT 1 FROM ${FLYWAY_TABLE} WHERE version = '\${version}' AND success = TRUE
);
PSQL
}

apply_if_needed() {
  local version="\$1"
  local check_sql="\$2"
  local file="\$3"
  ensure_flyway_table
  if flyway_has "\$version"; then
    echo "[content-migrate] V\${version} skip (flyway history)"
    return 0
  fi
  if psql_exec -tAc "\$check_sql" | grep -q '^t\$'; then
    echo "[content-migrate] V\${version} skip (schema present)"
    record_flyway "\$version" "\$file"
    return 0
  fi
  echo "[content-migrate] applying V\${version} ..."
  psql_exec -f - < "\$file"
  record_flyway "\$version" "\$file"
  echo "[content-migrate] V\${version} ok"
}

apply_if_needed "26" "SELECT to_regclass('public.agent_skill') IS NOT NULL" "\$STAGE/v26.sql"
apply_if_needed "27" "SELECT to_regclass('public.agent_profile') IS NOT NULL" "\$STAGE/v27.sql"
apply_if_needed "28" "SELECT to_regclass('public.crew_template') IS NOT NULL" "\$STAGE/v28.sql"
apply_if_needed "29" "SELECT to_regclass('public.agent_skill_revision') IS NOT NULL" "\$STAGE/v29.sql"
apply_if_needed "30" "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='agent_skill' AND column_name='enabled')" "\$STAGE/v30.sql"

rm -rf "\$STAGE"
echo "[content-migrate] done"
EOF

echo "[content-migrate] complete"
