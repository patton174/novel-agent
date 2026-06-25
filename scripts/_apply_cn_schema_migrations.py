"""Apply missing content (V18–V20) and billing (V21–V23) migrations to CN dev PostgreSQL."""
from __future__ import annotations

import pathlib
import sys

import psycopg2

ROOT = pathlib.Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / "scripts" / "local-cn.env"
CONTENT_MIGRATION_DIR = (
    ROOT / "novel-studio" / "studio-modules" / "studio-module-content" / "src" / "main" / "resources" / "db" / "migration"
)
BILLING_MIGRATION_DIR = (
    ROOT / "novel-studio" / "studio-modules" / "studio-module-billing" / "src" / "main" / "resources" / "db" / "migration"
)

CONTENT_VERSIONS = ("18", "19", "20")
BILLING_VERSIONS = ("21", "22", "23")

FLYWAY_CONTENT = "flyway_schema_history_content"
FLYWAY_BILLING = "flyway_schema_history_billing"


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


def print_status(cur) -> None:
    print("\n=== schema status ===")
    for table in ("ai_model", "user_model_credential", "ai_model_credential", "payment_order", "usage_event"):
        cur.execute("SELECT to_regclass(%s)", (f"public.{table}",))
        print(f"  {table}: {cur.fetchone()[0] or 'MISSING'}")
    for col in (("usage_event", "model_code"), ("usage_event", "byok"), ("payment_order", "plan_id")):
        print(f"  {col[0]}.{col[1]}:", "yes" if column_exists(cur, col[0], col[1]) else "MISSING")
    for table, versions in ((FLYWAY_CONTENT, CONTENT_VERSIONS), (FLYWAY_BILLING, BILLING_VERSIONS)):
        ensure_flyway_table(cur, table)
        for version in versions:
            print(f"  {table} V{version}:", "yes" if flyway_has_version(cur, table, version) else "no")


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
    print("\n=== content migrations (V18–V20) ===")
    for version in CONTENT_VERSIONS:
        if needs_content_version(cur, version):
            if not apply_version(cur, CONTENT_MIGRATION_DIR, version, FLYWAY_CONTENT):
                return 1
            changed = True
        elif not flyway_has_version(cur, FLYWAY_CONTENT, version):
            path = migration_file(CONTENT_MIGRATION_DIR, version)
            if path:
                record_flyway(cur, FLYWAY_CONTENT, version, path.name)
                print(f"  V{version} backfilled flyway history")
                changed = True
        else:
            print(f"  V{version} skip (already applied)")

    print("\n=== billing migrations (V21–V23) ===")
    for version in BILLING_VERSIONS:
        if needs_billing_version(cur, version):
            if not apply_version(cur, BILLING_MIGRATION_DIR, version, FLYWAY_BILLING):
                return 1
            changed = True
        else:
            print(f"  V{version} skip (already applied)")

    print("\n=== CN dev DB after ===")
    print_status(cur)
    print("\nDone." + (" Applied pending migrations." if changed else " Nothing to apply."))
    cur.close()
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
