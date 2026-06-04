"""托管模式 host_guard 单元测试。"""

import asyncio

import pytest

from app.runtime.events import build_event
from app.runtime.host_guard import resolve_host_mode, stream_with_host_guard


def test_resolve_host_mode_from_context():
    assert resolve_host_mode({"host_mode": True}) is True
    assert resolve_host_mode({"preferences": {"host_mode": True}}) is True
    assert resolve_host_mode({"host_mode": False}) is False
    assert resolve_host_mode({}) is False
    assert resolve_host_mode(None) is False


@pytest.mark.asyncio
async def test_stream_with_host_guard_passthrough_when_disabled():
    async def factory():
        yield {"type": "message.delta", "sequence": 2}

    events = [e async for e in stream_with_host_guard(factory, host_mode=False)]
    assert len(events) == 1


@pytest.mark.asyncio
async def test_stream_with_host_guard_retries_on_failure():
    calls = {"n": 0}

    async def factory():
        calls["n"] += 1
        if calls["n"] == 1:
            yield {"type": "think.started", "sequence": 2}
            raise RuntimeError("transient")

        yield {"type": "message.completed", "sequence": 3}

    recoveries: list[dict] = []

    async def recovery_factory(attempt: int, err: str):
        recoveries.append({"attempt": attempt, "error": err})
        return {"type": "run.recovering", "sequence": 99, "payload": {}}

    events = [
        e
        async for e in stream_with_host_guard(
            factory,
            host_mode=True,
            heartbeat_factory=None,
            recovery_factory=recovery_factory,
            max_retries=2,
            retry_base_delay=0.01,
        )
    ]

    assert calls["n"] == 2
    assert len(recoveries) == 1
    assert recoveries[0]["attempt"] == 1
    assert any(e.get("type") == "message.completed" for e in events)
    assert any(e.get("type") == "run.recovering" for e in events)


@pytest.mark.asyncio
async def test_iterate_with_heartbeat_emits_on_idle():
    from app.runtime.host_guard import _iterate_with_heartbeat

    async def slow_stream():
        yield {"n": 1}
        await asyncio.sleep(0.08)
        yield {"n": 2}

    heartbeats: list[dict] = []

    async def heartbeat():
        heartbeats.append({"hb": True})
        return {"hb": True}

    items = [
        item
        async for item in _iterate_with_heartbeat(
            slow_stream(),
            heartbeat_interval=0.02,
            heartbeat_factory=heartbeat,
        )
    ]

    assert {"n": 1} in items
    assert {"n": 2} in items
    assert len(heartbeats) >= 1
