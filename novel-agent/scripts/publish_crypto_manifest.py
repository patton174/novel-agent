#!/usr/bin/env python3
"""将 manifest 写入 Redis（部署 frontend 后执行）。"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

try:
    import redis
except ImportError:
    print("pip install redis", file=sys.stderr)
    raise

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "config" / "crypto-manifest.generated.json"
TTL_SEC = int(os.environ.get("CRYPTO_MANIFEST_TTL_SEC", str(86400 * 2)))


def main() -> None:
    if not MANIFEST.is_file():
        print(f"missing {MANIFEST}, run generate_crypto_manifest.py first", file=sys.stderr)
        sys.exit(1)
    host = os.environ.get("SPRING_DATA_REDIS_HOST") or os.environ.get("REDIS_HOST", "127.0.0.1")
    port = int(os.environ.get("SPRING_DATA_REDIS_PORT", os.environ.get("REDIS_PORT", "6379")))
    password = os.environ.get("SPRING_DATA_REDIS_PASSWORD") or os.environ.get("REDIS_PASSWORD") or None
    db = int(os.environ.get("REDIS_DB", "0"))
    client = redis.Redis(host=host, port=port, password=password, db=db, decode_responses=True)
    body = MANIFEST.read_text(encoding="utf-8")
    client.set("crypto:manifest:current", body, ex=TTL_SEC)
    doc = json.loads(body)
    print(f"[publish_crypto_manifest] version={doc.get('version')} ttl={TTL_SEC}s -> redis {host}")


if __name__ == "__main__":
    main()
