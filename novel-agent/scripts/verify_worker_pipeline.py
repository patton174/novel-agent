#!/usr/bin/env python3
"""Smoke test: Content run + Redis context + Python worker execute."""

from __future__ import annotations

import json
import os
import sys
import uuid

import httpx

CONTENT = os.environ.get("CONTENT_BASE_URL", "http://127.0.0.1:8091")
PYTHON = os.environ.get("AGENT_PYTHON_BASE_URL", "http://127.0.0.1:8000")
REDIS_HOST = os.environ.get("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.environ.get("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.environ.get("REDIS_PASSWORD", "changeme")
INTERNAL_KEY = os.environ.get("INTERNAL_SERVICE_KEY", "dev-internal-key-change-me")

HEADERS = {"X-Internal-Service-Key": INTERNAL_KEY}


def main() -> int:
    run_id = f"run_verify_{uuid.uuid4().hex[:12]}"
    session_id = f"session_verify_{uuid.uuid4().hex[:8]}"
    context = {
        "run_id": run_id,
        "session_id": session_id,
        "message_id": f"message_{uuid.uuid4().hex[:8]}",
        "user_id": 1,
        "mode": "auto",
        "user_message": "say hi in one short sentence",
        "chapter_text": "",
        "history": [],
        "story_memory": "",
        "preferences": {},
        "project": {},
        "chapters": [],
        "current_chapter_id": None,
        "novel_id": None,
        "step_index": 0,
        "last_tool": "",
        "last_reason": "",
        "context_patch": {},
        "selected_choice": None,
    }

    with httpx.Client(timeout=30.0) as client:
        # health
        for name, url in [("python", f"{PYTHON}/"), ("content", f"{CONTENT}/internal/agent/runs/smoke_missing")]:
            try:
                r = client.get(url, headers=HEADERS)
                print(f"[health] {name}: {r.status_code}")
            except Exception as exc:
                print(f"[health] {name}: FAIL {exc}")
                return 1

        # create PG run
        r = client.post(
            f"{CONTENT}/internal/agent/runs",
            headers=HEADERS,
            json={
                "runId": run_id,
                "sessionId": session_id,
                "userId": 1,
                "userMessageId": f"{run_id}:user",
                "assistantMessageId": f"{run_id}:assistant",
                "userMessageContent": context["user_message"],
                "mode": "auto",
            },
        )
        r.raise_for_status()
        print(f"[content] create run ok: {run_id}")

        # stage worker context in redis
        try:
            import redis
        except ImportError:
            print("[redis] pip install redis required for this script")
            return 1
        rds = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD, decode_responses=True)
        rds.set(f"run:worker:ctx:{run_id}", json.dumps(context, ensure_ascii=False), ex=86400)
        print("[redis] worker context saved")

        # invoke worker directly (same as dispatch listener)
        r = client.post(
            f"{PYTHON}/internal/worker/run/execute",
            headers=HEADERS,
            json={
                "run_id": run_id,
                "action": "start",
                "worker_id": "verify-script",
                "context": context,
            },
        )
        r.raise_for_status()
        body = r.json()
        print(f"[worker] execute: {body}")

        r = client.get(f"{CONTENT}/internal/agent/runs/{run_id}", headers=HEADERS)
        r.raise_for_status()
        run = r.json()
        print(f"[content] run status: {run.get('status')}")

        r = client.get(
            f"{CONTENT}/internal/agent/runs/{run_id}/events",
            headers=HEADERS,
            params={"after_sequence": -1},
        )
        r.raise_for_status()
        events = r.json()
        print(f"[content] events count: {len(events)}")

    status = str(body.get("status", ""))
    if status in ("completed", "running", "waiting_user") and len(events) > 0:
        print("PASS worker pipeline smoke test")
        return 0
    print("FAIL unexpected worker result")
    return 1


if __name__ == "__main__":
    sys.exit(main())
