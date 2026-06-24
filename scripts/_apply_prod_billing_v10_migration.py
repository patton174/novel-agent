"""Apply billing V10 BYOK usage columns to production PG if missing."""
from __future__ import annotations

import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
MW_HOST = "107.150.112.140"
PG_CONTAINER = "novel-studio-postgresql"
SQL_PATH = (
    ROOT
    / "novel-studio"
    / "studio-modules"
    / "studio-module-billing"
    / "src"
    / "main"
    / "resources"
    / "db"
    / "migration"
    / "V10__usage_byok_model_code.sql"
)


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
    col = ssh_psql(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_schema='public' AND table_name='usage_event' AND column_name='byok';"
    )
    print("usage_event.byok before:", col or "(missing)")
    if col:
        return 0

    sql = SQL_PATH.read_text(encoding="utf-8")
    print(f"applying {SQL_PATH.name} ...")
    ssh_psql_file(sql)

    col = ssh_psql(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_schema='public' AND table_name='usage_event' AND column_name='byok';"
    )
    print("usage_event.byok after:", col or "(missing)")
    return 0 if col else 1


if __name__ == "__main__":
    raise SystemExit(main())
