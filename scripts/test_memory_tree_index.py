#!/usr/bin/env python3
"""Login and call memory tree-index on production (encrypted /g/ route)."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.parse
import uuid

# Reuse crypto helpers from login test script
sys.path.insert(0, os.path.dirname(__file__))
from test_login_crypto import (  # noqa: E402
    DEFAULT_BASE,
    build_encrypted_route,
    build_login_envelope,
    compute_sign,
    fetch_crypto_runtime,
    http_request,
    post_login,
)


def signed_get(base: str, runtime, logical_path: str, token: str) -> dict:
    path = build_encrypted_route(logical_path, "GET", runtime)
    ts = int(time.time() * 1000)
    nonce = str(uuid.uuid4())
    sign = compute_sign("GET", logical_path, b"", runtime.aes_key_b64, ts, nonce)
    qs = urllib.parse.urlencode(
        {
            "_na_t": str(ts),
            "_na_n": nonce,
            "_na_k": runtime.key_id,
            "_na_s": sign,
        }
    )
    url = f"{base.rstrip('/')}{path}?{qs}"
    res = http_request(
        "GET",
        url,
        headers={
            "Authorization": token,
            "X-Trace-Id": uuid.uuid4().hex,
            "X-Fingerprint": "py-memory-test",
        },
    )
    print(f"\nGET {logical_path}")
    print(f"HTTP {res.status}")
    print(res.body[:2000])
    try:
        return json.loads(res.body)
    except json.JSONDecodeError:
        return {"raw": res.body, "status": res.status}


def main() -> int:
    parser = argparse.ArgumentParser(description="Test memory tree-index API")
    parser.add_argument("--base", default=DEFAULT_BASE)
    parser.add_argument("--username", default=os.environ.get("NOVEL_AGENT_USER", ""))
    parser.add_argument("--password", default=os.environ.get("NOVEL_AGENT_PASS", ""))
    parser.add_argument("--novel-id", default=os.environ.get("NOVEL_AGENT_NOVEL_ID", ""))
    args = parser.parse_args()

    if not args.username or not args.password:
        print("Set NOVEL_AGENT_USER / NOVEL_AGENT_PASS or pass --username/--password", file=sys.stderr)
        return 2

    runtime = fetch_crypto_runtime(args.base)
    login = post_login(args.base, runtime, args.username, args.password, use_encrypted_route=True)
    if login.status != 200:
        print(f"login failed: {login.body[:500]}")
        return 1

    body = json.loads(login.body)
    token = body.get("data", {}).get("token") if isinstance(body.get("data"), dict) else None
    if not token:
        print("login ok but no token in response")
        return 1

    novels = signed_get(args.base, runtime, "/api/content/auth/novels", token)
    novel_id = args.novel_id
    if not novel_id:
        data = novels.get("data")
        if isinstance(data, list) and data:
            novel_id = str(data[0].get("id") or data[0].get("novelId") or "")
            print(f"Using first novel: {novel_id}")
    if not novel_id:
        print("No novel id; pass --novel-id")
        return 2

    tree_index = signed_get(
        args.base,
        runtime,
        f"/api/content/auth/novels/{urllib.parse.quote(novel_id, safe='')}/memory-nodes/tree-index",
        token,
    )
    data = tree_index.get("data")
    if isinstance(data, dict) and data:
        print(f"\nOK: tree-index scopes={list(data.keys())}")
        return 0
    print("\nEMPTY tree-index data={}")
    flat_path = (
        f"/api/content/auth/novels/{urllib.parse.quote(novel_id, safe='')}"
        "/memory-nodes/flat?scope=characters&includeContent=false"
    )
    signed_get(args.base, runtime, flat_path, token)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
