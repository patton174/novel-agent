"""Check production PostgreSQL for ai_model migrations (V18–V20)."""
from __future__ import annotations

import subprocess
import sys

MW_HOST = "107.150.112.140"
PG_CONTAINER = "novel-studio-postgresql"
PG = f"docker exec {PG_CONTAINER} psql -U postgres -d novel_agent -t -A"

CHECKS = [
    ("ai_model", "SELECT to_regclass('public.ai_model');"),
    ("user_model", "SELECT to_regclass('public.user_model');"),
    ("user_model_credential", "SELECT to_regclass('public.user_model_credential');"),
    ("ai_model_credential", "SELECT to_regclass('public.ai_model_credential');"),
    ("ai_model.credential_id", """
        SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name='ai_model' AND column_name='credential_id';
    """),
    ("user_model.credential_id", """
        SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name='user_model' AND column_name='credential_id';
    """),
    ("content flyway latest", """
        SELECT version FROM flyway_schema_history_content
        ORDER BY installed_rank DESC LIMIT 1;
    """),
    ("content flyway V18", """
        SELECT version FROM flyway_schema_history_content WHERE version='18' LIMIT 1;
    """),
    ("content flyway V20", """
        SELECT version FROM flyway_schema_history_content WHERE version='20' LIMIT 1;
    """),
    ("billing usage_event.byok", """
        SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name='usage_event' AND column_name='byok';
    """),
]


def run_remote(sql: str) -> str:
    cmd = [
        "ssh",
        "-o",
        "BatchMode=yes",
        f"root@{MW_HOST}",
        f"{PG} -c \"{sql.replace(chr(10), ' ').strip()}\"",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip())
    return proc.stdout.strip()


def main() -> int:
    print(f"=== Production PG check ({MW_HOST}) ===")
    missing: list[str] = []
    for label, sql in CHECKS:
        try:
            value = run_remote(sql)
        except Exception as exc:
            print(f"[ERR] {label}: {exc}")
            missing.append(label)
            continue
        ok = bool(value) and value not in ("", "f", "NULL")
        status = "OK" if ok else "MISSING"
        print(f"[{status}] {label}: {value or '(empty)'}")
        if not ok:
            missing.append(label)

    if missing:
        print("\nMissing items:", ", ".join(missing))
        print("Apply migrations before deploy (novel-studio startup or manual SQL).")
        return 1

    print("\nProduction PG ready for model feature deploy.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
