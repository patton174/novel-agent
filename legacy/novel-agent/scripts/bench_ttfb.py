#!/usr/bin/env python3
"""Measure SSE time-to-first-byte via gateway."""
from __future__ import annotations

import time

import httpx

GATEWAY = "http://127.0.0.1:8080"
USERNAME = "e2e_user"
PASSWORD = "Test123456!"


def main() -> None:
    login = httpx.post(
        f"{GATEWAY}/api/auth/login",
        json={"username": USERNAME, "password": PASSWORD},
        timeout=10,
    )
    login.raise_for_status()
    token = login.json()["token"]
    headers = {"Authorization": token, "Content-Type": "application/json"}
    body = {"message": "请用一句话续写：夜色深沉。", "mode": "continue"}

    t0 = time.perf_counter()
    with httpx.stream(
        "POST",
        f"{GATEWAY}/api/agent/chat/stream",
        headers=headers,
        json=body,
        timeout=90,
    ) as resp:
        print("status", resp.status_code, "headers", f"{time.perf_counter() - t0:.3f}s")
        for i, chunk in enumerate(resp.iter_text(), start=1):
            elapsed = time.perf_counter() - t0
            print(
                f"chunk{i} t={elapsed:.3f}s len={len(chunk)} "
                f"gw={'gateway.connected' in chunk} run={'run.started' in chunk}"
            )
            if i >= 3:
                break


if __name__ == "__main__":
    main()
