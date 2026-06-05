#!/usr/bin/env python3
"""从 crypto-routes.yaml 生成路由 manifest JSON。"""
from __future__ import annotations

import base64
import hashlib
import json
import time
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
ROUTES_YAML = ROOT / "config" / "crypto-routes.yaml"
OUT = ROOT / "config" / "crypto-manifest.generated.json"


def route_token(method: str, path: str, version: int) -> str:
    digest = hashlib.sha256(f"{method.upper()}|{path}|{version}".encode()).digest()
    return "r" + base64.urlsafe_b64encode(digest).decode().rstrip("=")[:7]


def main() -> None:
    data = yaml.safe_load(ROUTES_YAML.read_text(encoding="utf-8"))
    version = int(time.time())
    expires = version * 1000 + 86400 * 1000
    routes: dict[str, dict[str, str]] = {}
    for item in data.get("routes", []):
        method = str(item["method"]).upper()
        path = str(item["path"])
        token = route_token(method, path, version)
        routes[token] = {"method": method, "path": path}
    manifest = {
        "version": version,
        "expiresAtEpochMs": expires,
        "routes": routes,
    }
    OUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[generate_crypto_manifest] version={version} routes={len(routes)} -> {OUT}")


if __name__ == "__main__":
    main()
