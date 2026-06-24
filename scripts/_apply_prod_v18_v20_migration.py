"""Apply content V18-V20 migrations to production PG if tables missing."""
from __future__ import annotations

import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / "scripts" / "local-remote.env"
MIGRATION_DIR = (
    ROOT
    / "novel-studio"
    / "studio-modules"
    / "studio-module-content"
    / "src"
    / "main"
    / "resources"
    / "db"
    / "migration"
)
MW_HOST = "107.150.112.140"
PG_CONTAINER = "novel-studio-postgresql"
VERSIONS = ("18", "19", "20")


def load_env(path: pathlib.Path) -> dict[str, str]:
    env: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"')
    return env


def ssh_psql(sql: str) -> str:
    inner = f'docker exec {PG_CONTAINER} psql -U postgres -d novel_agent -t -A -c "{sql}"'
    proc = subprocess.run(
        ["ssh", "-o", "BatchMode=yes", f"root@{MW_HOST}", inner],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip())
    return proc.stdout.strip()


def ssh_psql_file(sql: str) -> None:
    # pipe SQL via stdin to avoid quoting issues
    remote = f"docker exec -i {PG_CONTAINER} psql -U postgres -d novel_agent -v ON_ERROR_STOP=1"
    proc = subprocess.run(
        ["ssh", "-o", "BatchMode=yes", f"root@{MW_HOST}", remote],
        input=sql,
        capture_output=True,
        text=True,
        timeout=120,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip())


def main() -> int:
    if not ENV_PATH.is_file():
        print(f"missing {ENV_PATH}", file=sys.stderr)
        return 1

    exists = ssh_psql("SELECT to_regclass('public.ai_model');")
    print("ai_model before:", exists or "(missing)")

    for version in VERSIONS:
        row = ssh_psql(
            f"SELECT version FROM flyway_schema_history_content WHERE version='{version}' LIMIT 1;"
        )
        if row:
            print(f"V{version} already in flyway history")
            continue
        sql_path = MIGRATION_DIR / f"V{version}__"
        matches = list(MIGRATION_DIR.glob(f"V{version}__*.sql"))
        if not matches:
            print(f"migration file for V{version} not found", file=sys.stderr)
            return 1
        sql = matches[0].read_text(encoding="utf-8")
        print(f"applying {matches[0].name} ...")
        ssh_psql_file(sql)
        script_name = matches[0].name
        record = f"""
INSERT INTO flyway_schema_history_content
    (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success)
VALUES (
    (SELECT COALESCE(MAX(installed_rank), 0) + 1 FROM flyway_schema_history_content),
    '{version}',
    '{script_name.split('__', 1)[1].replace('.sql', '')}',
    'SQL',
    '{script_name}',
    NULL,
    'manual_predeploy',
    NOW(),
    0,
    TRUE
);
"""
        ssh_psql_file(record)
        print(f"V{version} applied")

    exists = ssh_psql("SELECT to_regclass('public.ai_model');")
    print("ai_model after:", exists or "(missing)")
    return 0 if exists else 1


if __name__ == "__main__":
    raise SystemExit(main())
