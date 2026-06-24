"""Apply V19 user_model_credential migration to CN dev DB if missing."""
from __future__ import annotations

import pathlib
import sys

import psycopg2

ROOT = pathlib.Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / "scripts" / "local-cn.env"
V19_PATH = (
    ROOT
    / "novel-studio"
    / "studio-modules"
    / "studio-module-content"
    / "src"
    / "main"
    / "resources"
    / "db"
    / "migration"
    / "V19__user_model_credential.sql"
)


def load_env(path: pathlib.Path) -> dict[str, str]:
    env: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"')
    return env


def main() -> int:
    if not ENV_PATH.is_file():
        print(f"missing {ENV_PATH}", file=sys.stderr)
        return 1
    env = load_env(ENV_PATH)
    conn = psycopg2.connect(
        host=env["DB_HOST"],
        port=int(env.get("DB_PORT", "5432")),
        dbname=env["DB_NAME"],
        user=env["DB_USER"],
        password=env["DB_PASSWORD"],
    )
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='user_model' AND column_name='credential_id'"
    )
    has_col = cur.fetchone() is not None
    print(f"user_model.credential_id before: {has_col}")
    if not has_col:
        cur.execute(V19_PATH.read_text(encoding="utf-8"))
        print("applied V19__user_model_credential.sql")
    cur.execute("SELECT to_regclass('public.user_model_credential')")
    table = cur.fetchone()[0]
    print(f"user_model_credential after: {table}")
    cur.close()
    conn.close()
    return 0 if table else 1


if __name__ == "__main__":
    raise SystemExit(main())
