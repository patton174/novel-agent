"""Apply auth_user.ui_prefs on CN dev DB (Flyway disabled locally)."""
from __future__ import annotations

import os
import sys
from pathlib import Path

try:
    import psycopg2
except ImportError:
    print("Install psycopg2: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)


def load_cn_env(root: Path) -> None:
    path = root / "scripts" / "local-cn.env"
    if not path.is_file():
        raise SystemExit(f"missing {path}")
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        os.environ.setdefault(key.strip(), val.strip())


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    load_cn_env(root)
    conn = psycopg2.connect(
        host=os.environ["DB_HOST"],
        port=int(os.environ.get("DB_PORT", "5432")),
        dbname=os.environ.get("DB_NAME", "novel_studio"),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
    )
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("ALTER TABLE auth_user ADD COLUMN IF NOT EXISTS ui_prefs TEXT")
    conn.close()
    print("auth_user.ui_prefs OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
