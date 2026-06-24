"""Apply V20 ai_model_credential migration to CN dev DB if missing."""
from __future__ import annotations

import pathlib
import sys

import psycopg2

ROOT = pathlib.Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / "scripts" / "local-cn.env"
V20_PATH = (
    ROOT
    / "novel-studio"
    / "studio-modules"
    / "studio-module-content"
    / "src"
    / "main"
    / "resources"
    / "db"
    / "migration"
    / "V20__ai_model_credential.sql"
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
    sql = V20_PATH.read_text(encoding="utf-8")
    conn = psycopg2.connect(
        host=env["DB_HOST"],
        port=int(env.get("DB_PORT", 5432)),
        dbname=env["DB_NAME"],
        user=env["DB_USER"],
        password=env["DB_PASSWORD"],
    )
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT to_regclass('public.ai_model_credential')")
    exists = cur.fetchone()[0]
    print("ai_model_credential before:", exists)
    if not exists:
        cur.execute(sql)
        print("applied V20 migration")
    cur.execute("SELECT to_regclass('public.ai_model_credential')")
    print("ai_model_credential after:", cur.fetchone()[0])
    cur.close()
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
