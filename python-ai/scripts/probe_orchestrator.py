#!/usr/bin/env python3
"""Probe crawl orchestrator state via internal APIs (run on worker python-ai container)."""

import json
import os
import urllib.request

BASE = os.environ.get("CONTENT_BASE_URL", "http://agent-content:8091").rstrip("/")
KEY = os.environ["INTERNAL_SERVICE_KEY"]


def get(path: str) -> dict:
    req = urllib.request.Request(
        f"{BASE}{path}",
        headers={"X-Internal-Service-Key": KEY},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())


def main() -> None:
    state = get("/internal/crawl/orchestrator")
    running = get("/internal/crawl/jobs/running-count")
    overview = get("/internal/crawl/catalog/overview?limit=10")
    jobs = get("/internal/crawl/orchestrator/jobs?pageCurrent=1&pageSize=15")
    decisions = get("/internal/crawl/orchestrator/decisions?afterSeq=0&limit=30") if False else None

    print("=== STATE ===")
    print(json.dumps(state, ensure_ascii=False, indent=2))
    print("=== RUNNING ===")
    print(json.dumps(running, ensure_ascii=False))
    print("=== CATALOG (summary) ===")
    print(
        json.dumps(
            {
                "totalNovels": overview.get("totalNovels"),
                "missingCoverCount": overview.get("missingCoverCount"),
                "missingCover": overview.get("missingCover"),
                "incomplete": overview.get("incomplete"),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    print("=== ACTIVE JOBS ===")
    job_list = jobs.get("list") or []
    for j in job_list:
        if str(j.get("status", "")).upper() in {"RUNNING", "PAUSED", "PENDING"}:
            cfg = j.get("configJson") or ""
            sub = ""
            try:
                sub = json.loads(cfg).get("goal", "") if cfg else ""
            except Exception:
                sub = cfg[:80]
            print(
                json.dumps(
                    {
                        "id": j.get("id"),
                        "status": j.get("status"),
                        "sourceUrl": j.get("sourceUrl"),
                        "catalogNovelId": j.get("catalogNovelId"),
                        "chaptersDone": j.get("chaptersDone"),
                        "chaptersTotal": j.get("chaptersTotal"),
                        "sub_goal": sub[:200],
                        "errorMessage": j.get("errorMessage"),
                    },
                    ensure_ascii=False,
                )
            )


if __name__ == "__main__":
    main()
