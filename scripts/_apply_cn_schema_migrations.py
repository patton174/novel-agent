"""Apply missing Flyway migrations to CN dev PostgreSQL (local profile has Flyway disabled)."""
from __future__ import annotations

import pathlib
import sys

import psycopg2

ROOT = pathlib.Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / "scripts" / "local-cn.env"
MODULES = ROOT / "novel-studio" / "studio-modules"

CONTENT_MIGRATION_DIR = MODULES / "studio-module-content" / "src" / "main" / "resources" / "db" / "migration"
BILLING_MIGRATION_DIR = MODULES / "studio-module-billing" / "src" / "main" / "resources" / "db" / "migration"
AUTH_MIGRATION_DIR = MODULES / "studio-module-auth" / "src" / "main" / "resources" / "db" / "migration"
NOTIFICATION_MIGRATION_DIR = (
    MODULES / "studio-module-notification" / "src" / "main" / "resources" / "db" / "migration"
)
WORKER_MIGRATION_DIR = MODULES / "studio-module-worker" / "src" / "main" / "resources" / "db" / "migration"
SCHEDULING_MIGRATION_DIR = (
    ROOT / "novel-studio" / "studio-platform" / "studio-platform-scheduling" / "src" / "main" / "resources" / "db" / "migration"
)

CONTENT_VERSIONS = ("18", "19", "20", "21", "22", "24", "25")
BILLING_VERSIONS = ("21", "22", "23", "24", "25", "26", "27", "28")
AUTH_VERSIONS = ("17",)
NOTIFICATION_VERSIONS = ("28",)
STUDIO_VERSIONS = ("26",)
# Same Flyway version in multiple jars (run + config); apply by table presence.
STUDIO_MIGRATION_SOURCES = (
    (WORKER_MIGRATION_DIR, "26", "scheduled_job_run"),
    (SCHEDULING_MIGRATION_DIR, "26", "scheduled_job_config"),
)

FLYWAY_CONTENT = "flyway_schema_history_content"
FLYWAY_BILLING = "flyway_schema_history_billing"
FLYWAY_AUTH = "flyway_schema_history_auth"
FLYWAY_NOTIFICATION = "flyway_schema_history_notification"
FLYWAY_STUDIO = "flyway_schema_history_studio"


def load_env(path: pathlib.Path) -> dict[str, str]:
    env: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"')
    return env


def migration_file(directory: pathlib.Path, version: str) -> pathlib.Path | None:
    matches = sorted(directory.glob(f"V{version}__*.sql"))
    if len(matches) > 1:
        print(f"  WARNING: multiple V{version} files in {directory.name}: {[m.name for m in matches]}", file=sys.stderr)
    return matches[0] if matches else None


def table_exists(cur, name: str) -> bool:
    cur.execute("SELECT to_regclass(%s)", (f"public.{name}",))
    return cur.fetchone()[0] is not None


def column_exists(cur, table: str, column: str) -> bool:
    cur.execute(
        """
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s AND column_name = %s
        LIMIT 1
        """,
        (table, column),
    )
    return cur.fetchone() is not None


def flyway_has_version(cur, table: str, version: str) -> bool:
    ensure_flyway_table(cur, table)
    cur.execute(
        f"SELECT 1 FROM {table} WHERE version = %s AND success = TRUE LIMIT 1",
        (version,),
    )
    return cur.fetchone() is not None


def ensure_flyway_table(cur, table: str) -> None:
    cur.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {table} (
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
        )
        """
    )


def record_flyway(cur, table: str, version: str, script_name: str) -> None:
    ensure_flyway_table(cur, table)
    if flyway_has_version(cur, table, version):
        return
    description = script_name.split("__", 1)[1].replace(".sql", "")
    cur.execute(
        f"""
        INSERT INTO {table}
            (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success)
        VALUES (
            (SELECT COALESCE(MAX(installed_rank), 0) + 1 FROM {table}),
            %s, %s, 'SQL', %s, NULL, 'cn_manual_apply', NOW(), 0, TRUE
        )
        """,
        (version, description, script_name),
    )


def needs_content_version(cur, version: str) -> bool:
    if flyway_has_version(cur, FLYWAY_CONTENT, version):
        return False
    if version == "18":
        return not table_exists(cur, "ai_model")
    if version == "19":
        return not table_exists(cur, "user_model_credential")
    if version == "20":
        return not table_exists(cur, "ai_model_credential")
    if version == "21":
        return not table_exists(cur, "crawl_orchestrator_state")
    if version == "22":
        return not column_exists(cur, "crawl_catalog_novel", "index_status")
    if version == "24":
        return not table_exists(cur, "kg_entity")
    return True


def needs_billing_version(cur, version: str) -> bool:
    if flyway_has_version(cur, FLYWAY_BILLING, version):
        return False
    if version == "21":
        return not column_exists(cur, "usage_event", "model_code")
    if version == "22":
        return not table_exists(cur, "payment_order")
    if version == "23":
        return not column_exists(cur, "payment_order", "plan_id")
    if version == "24":
        return not column_exists(cur, "site_content", "locale")
    if version == "25":
        return not column_exists(cur, "site_danmaku", "message_en")
    if version == "26":
        return not table_exists(cur, "gift_campaign")
    if version == "27":
        return not table_exists(cur, "referral_code")
    if version == "28":
        return not table_exists(cur, "user_balance")
    return True


def needs_auth_version(cur, version: str) -> bool:
    if flyway_has_version(cur, FLYWAY_AUTH, version):
        return False
    if version == "17":
        return not table_exists(cur, "invite_code")
    return True


def needs_notification_version(cur, version: str) -> bool:
    if flyway_has_version(cur, FLYWAY_NOTIFICATION, version):
        return False
    if version == "28":
        return not table_exists(cur, "user_notification")
    return True


def needs_studio_version(cur, version: str) -> bool:
    if version != "26":
        return not flyway_has_version(cur, FLYWAY_STUDIO, version)
    return any(not table_exists(cur, table) for _, _, table in STUDIO_MIGRATION_SOURCES)


def apply_studio_migrations(cur) -> bool:
    print("\n=== studio/worker migrations (V26) ===")
    recorded = flyway_has_version(cur, FLYWAY_STUDIO, "26")
    for directory, version, table in STUDIO_MIGRATION_SOURCES:
        if table_exists(cur, table):
            print(f"  {table} skip (already exists)")
            continue
        if not apply_version(cur, directory, version, FLYWAY_STUDIO):
            return False
        recorded = True
    if recorded and not flyway_has_version(cur, FLYWAY_STUDIO, "26"):
        path = migration_file(WORKER_MIGRATION_DIR, "26") or migration_file(SCHEDULING_MIGRATION_DIR, "26")
        if path:
            record_flyway(cur, FLYWAY_STUDIO, "26", path.name)
    return True


def apply_version(cur, directory: pathlib.Path, version: str, flyway_table: str) -> bool:
    path = migration_file(directory, version)
    if not path:
        print(f"  migration file for V{version} not found", file=sys.stderr)
        return False
    sql = path.read_text(encoding="utf-8")
    print(f"  applying {path.name} ...")
    cur.execute(sql)
    record_flyway(cur, flyway_table, version, path.name)
    print(f"  V{version} ok")
    return True


def apply_module(
    cur,
    label: str,
    directory: pathlib.Path,
    versions: tuple[str, ...],
    flyway_table: str,
    needs_fn,
) -> bool:
    """Return False only when a migration apply fails."""
    print(f"\n=== {label} ===")
    for version in versions:
        if needs_fn(cur, version):
            if not apply_version(cur, directory, version, flyway_table):
                return False
        elif not flyway_has_version(cur, flyway_table, version):
            path = migration_file(directory, version)
            if path:
                record_flyway(cur, flyway_table, version, path.name)
                print(f"  V{version} backfilled flyway history")
        else:
            print(f"  V{version} skip (already applied)")
    return True


def print_status(cur) -> None:
    print("\n=== schema status ===")
    checks = (
        "ai_model",
        "crawl_orchestrator_state",
        "kg_entity",
        "payment_order",
        "user_balance",
        "gift_campaign",
        "referral_code",
        "invite_code",
        "user_notification",
        "scheduled_job_run",
        "scheduled_job_config",
    )
    for table in checks:
        cur.execute("SELECT to_regclass(%s)", (f"public.{table}",))
        print(f"  {table}: {cur.fetchone()[0] or 'MISSING'}")
    for col in (("usage_event", "model_code"), ("payment_order", "plan_id"), ("crawl_catalog_novel", "index_status")):
        print(f"  {col[0]}.{col[1]}:", "yes" if column_exists(cur, col[0], col[1]) else "MISSING")


def main() -> int:
    if not ENV_PATH.is_file():
        print(f"missing {ENV_PATH} — copy from scripts/local-cn.env.example", file=sys.stderr)
        return 1
    env = load_env(ENV_PATH)
    if not env.get("DB_PASSWORD"):
        print("DB_PASSWORD empty in local-cn.env", file=sys.stderr)
        return 1

    conn = psycopg2.connect(
        host=env["DB_HOST"],
        port=int(env.get("DB_PORT", "5432")),
        dbname=env["DB_NAME"],
        user=env["DB_USER"],
        password=env["DB_PASSWORD"],
    )
    conn.autocommit = True
    cur = conn.cursor()

    print("=== CN dev DB before ===")
    print_status(cur)

    changed = False
    for label, directory, versions, flyway_table, needs_fn in (
        ("content migrations (V18–V25)", CONTENT_MIGRATION_DIR, CONTENT_VERSIONS, FLYWAY_CONTENT, needs_content_version),
        ("billing migrations (V21–V28)", BILLING_MIGRATION_DIR, BILLING_VERSIONS, FLYWAY_BILLING, needs_billing_version),
        ("auth migrations (V17)", AUTH_MIGRATION_DIR, AUTH_VERSIONS, FLYWAY_AUTH, needs_auth_version),
        ("notification migrations (V28)", NOTIFICATION_MIGRATION_DIR, NOTIFICATION_VERSIONS, FLYWAY_NOTIFICATION, needs_notification_version),
    ):
        if apply_module(cur, label, directory, versions, flyway_table, needs_fn) is False:
            return 1
    if apply_studio_migrations(cur) is False:
        return 1
    print("\n=== CN dev DB after ===")
    print_status(cur)
    print("\nDone.")
    cur.close()
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
