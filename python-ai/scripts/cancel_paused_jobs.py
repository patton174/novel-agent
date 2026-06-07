#!/usr/bin/env python3
"""Cancel all PAUSED crawl jobs to free orchestrator slots (worker one-off)."""

from __future__ import annotations

import json
import os
import urllib.request

BASE = os.environ.get("CONTENT_BASE_URL", "http://agent-content:8091").rstrip("/")
KEY = os.environ["INTERNAL_SERVICE_KEY"]
HEADERS = {"X-Internal-Service-Key": KEY, "Content-Type": "application/json"}


def get(path: str) -> dict:
    req = urllib.request.Request(f"{BASE}{path}", headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())


def post(path: str) -> dict:
    req = urllib.request.Request(f"{BASE}{path}", headers=HEADERS, method="POST", data=b"{}")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())


def main() -> None:
    page = get("/internal/crawl/orchestrator/jobs?pageCurrent=1&pageSize=50")
    jobs = page.get("list") or []
    paused = [j for j in jobs if str(j.get("status", "")).upper() == "PAUSED"]
    print(f"found {len(paused)} PAUSED jobs")
    for j in paused:
        jid = j.get("id")
        print(f"cancel {jid} {j.get('sourceUrl')}")
        try:
            post(f"/internal/crawl/jobs/{jid}/cancel")
            print("  ok")
        except Exception as exc:
            print(f"  fail: {exc}")
    running = get("/internal/crawl/jobs/running-count")
    print("running-count:", json.dumps(running, ensure_ascii=False))


if __name__ == "__main__":
    main()
