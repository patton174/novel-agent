#!/usr/bin/env python3
"""E2E：网关登录 -> Agent SSE 流式（经 Java Gateway -> Python AI）。"""
from __future__ import annotations

import json
import sys
import uuid

import httpx

GATEWAY = "http://127.0.0.1:8080"
AUTH_DIRECT = "http://127.0.0.1:8081"
USERNAME = "e2e_user"
PASSWORD = "Test123456!"
EMAIL = "e2e@example.com"


def ensure_user(client: httpx.Client) -> str:
    login = client.post(
        f"{GATEWAY}/api/auth/login",
        json={"username": USERNAME, "password": PASSWORD},
    )
    if login.status_code == 200:
        return login.json()["token"]

    reg = client.post(
        f"{GATEWAY}/api/auth/register",
        json={"username": USERNAME, "password": PASSWORD, "email": EMAIL},
    )
    if reg.status_code not in (200, 204):
        raise RuntimeError(f"register failed: {reg.status_code} {reg.text}")

    login = client.post(
        f"{GATEWAY}/api/auth/login",
        json={"username": USERNAME, "password": PASSWORD},
    )
    if login.status_code != 200:
        raise RuntimeError(f"login failed: {login.status_code} {login.text}")
    return login.json()["token"]


def run_stream(token: str) -> None:
    headers = {"Authorization": token, "Content-Type": "application/json"}
    body = {
        "message": "请用一句话续写：夜色深沉。",
        "mode": "continue",
    }
    event_types: list[str] = []
    saw_stream_end = False

    with httpx.stream(
        "POST",
        f"{GATEWAY}/api/agent/chat/stream",
        headers=headers,
        json=body,
        timeout=120.0,
    ) as resp:
        if resp.status_code != 200:
            raise RuntimeError(f"stream HTTP {resp.status_code}: {resp.read().decode()[:500]}")

        buffer = ""
        for chunk in resp.iter_text():
            buffer += chunk
            while "\n\n" in buffer:
                frame, buffer = buffer.split("\n\n", 1)
                event_name = "message"
                data_line = ""
                for line in frame.split("\n"):
                    if line.startswith("event:"):
                        event_name = line[6:].strip()
                    elif line.startswith("data:"):
                        data_line = line[5:].strip()
                    elif line.startswith("data:event:"):
                        event_name = line[11:].strip()
                    elif line.startswith("data:data:"):
                        data_line = line[10:].strip()
                if event_name == "agent-event" and data_line:
                    payload = json.loads(data_line)
                    event_types.append(payload.get("type", "?"))
                if event_name == "stream-end":
                    saw_stream_end = True

    print("[OK] SSE 事件类型序列:", " -> ".join(event_types[:12]), ("..." if len(event_types) > 12 else ""))
    if not event_types:
        raise RuntimeError("未收到 agent-event")
    if "run.started" not in event_types:
        raise RuntimeError("缺少 run.started")
    if not any(t.startswith("message.") for t in event_types):
        raise RuntimeError("缺少 message.* 事件")
    if not saw_stream_end:
        raise RuntimeError("缺少 stream-end")
    print("[OK] E2E 通过：Gateway(8080) -> Python(8000) 标准事件流正常")


def main() -> int:
    try:
        with httpx.Client(timeout=15.0) as client:
            # 网关可达性
            try:
                client.get(GATEWAY, timeout=3.0)
            except httpx.ConnectError:
                print(f"[FAIL] 网关未启动: {GATEWAY}")
                return 1

            token = ensure_user(client)
            print("[OK] 经网关登录成功, token=", token[:16] + "...")
            run_stream(token)
        return 0
    except Exception as exc:
        print("[FAIL]", exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())
