#!/usr/bin/env python3
"""Worker 向 MW Auth 注册 bootstrap 密钥，输出 runtime JSON（供写入 Worker env + crypto-runtime.json）。"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "config" / "crypto-manifest.generated.json"


def main() -> None:
    mw_host = os.environ.get("MW_HOST", "127.0.0.1")
    auth_port = os.environ.get("AUTH_INTERNAL_PORT", "8081")
    internal_key = os.environ.get("AGENT_INTERNAL_SERVICE_KEY") or os.environ.get("INTERNAL_SERVICE_KEY")
    if not internal_key:
        print("AGENT_INTERNAL_SERVICE_KEY required", file=sys.stderr)
        sys.exit(1)

    host_label = os.environ.get("WORKER_HOST", os.environ.get("FRONTEND_SERVER_HOST", "worker"))
    ttl = int(os.environ.get("CRYPTO_REGISTER_TTL_SEC", str(86400 * 2)))

    manifest = None
    if MANIFEST.is_file():
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    elif os.environ.get("SKIP_MANIFEST") != "1":
        print(f"run generate_crypto_manifest.py first (missing {MANIFEST})", file=sys.stderr)
        sys.exit(1)

    body: dict = {"host": host_label, "ttlSec": ttl}
    if manifest:
        body["manifest"] = manifest

    req = urllib.request.Request(
        f"http://{mw_host}:{auth_port}/internal/crypto/register-frontend-server",
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "X-Internal-Service-Key": internal_key,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            runtime = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(e.read().decode(), file=sys.stderr)
        sys.exit(1)

    out_path = os.environ.get("CRYPTO_RUNTIME_OUT")
    if out_path:
        Path(out_path).write_text(json.dumps(runtime, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(runtime, ensure_ascii=False))


if __name__ == "__main__":
    main()
