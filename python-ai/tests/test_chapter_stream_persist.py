"""Tests for streaming chapter append persistence (AGENT_REFACTOR_PLAN P1.1).

The appender now persists synchronously (awaited) through the Content client.
We patch ``chapter_client.persist_chapter_write`` to simulate the Content API.
"""

import asyncio

import pytest

from app.agent.schemas import AgentRunContext
from app.agent.tools.chapter_stream_persist import StreamingChapterAppender


def _ctx() -> AgentRunContext:
    return AgentRunContext(
        user_id=1,
        session_id="s1",
        novel_id="novel-1",
        run_id="run_1",
        message_id="msg_1",
    )


@pytest.mark.asyncio
async def test_streaming_appender_backfills_chapter_id_single_create(monkeypatch):
    """First persist (POST) returns a new id; later flushes reuse it (PUT) — one create."""
    calls: list[dict] = []

    async def _fake_persist(ctx, cw):
        calls.append(dict(cw))
        # Simulate POST creating a chapter only when no chapter_id present.
        cid = str(cw.get("chapter_id") or "").strip() or "ch-new-1"
        return True, {**cw, "chapter_id": cid, "persisted": True}, ""

    async def _fake_finalize(ctx, patch):
        return patch, None

    monkeypatch.setattr(
        "app.agent.backend.chapter_client.persist_chapter_write", _fake_persist
    )
    monkeypatch.setattr(
        "app.agent.tools.chapter_stream.persist_chapter_write_patch", _fake_finalize
    )
    monkeypatch.setattr(
        "app.agent.tools.chapter_stream_persist._FLUSH_DEBOUNCE_SEC", 0.01
    )
    monkeypatch.setattr("app.agent.tools.chapter_stream_persist._MIN_FLUSH_CHARS", 1)

    appender = StreamingChapterAppender(_ctx(), title="第一章", stream_input={})
    await appender.append_delta("hello world " * 40)
    await asyncio.sleep(0.05)
    await appender.append_delta("more content " * 40)
    await asyncio.sleep(0.05)

    patch, err = await appender.finalize()
    assert err is None
    assert patch["chapter_write"]["persisted"] is True
    assert patch["chapter_write"]["chapter_id"] == "ch-new-1"
    # Exactly one POST (no chapter_id), the rest PUT (chapter_id present).
    creates = [c for c in calls if not c.get("chapter_id")]
    assert len(creates) == 1


@pytest.mark.asyncio
async def test_streaming_appender_finalize_reports_failure(monkeypatch):
    """A failing persist must surface the real error + chapter_persist_failures."""

    async def _fail_persist(ctx, cw):
        return False, dict(cw), "HTTP 500 upstream"

    monkeypatch.setattr(
        "app.agent.backend.chapter_client.persist_chapter_write", _fail_persist
    )
    monkeypatch.setattr(
        "app.agent.tools.chapter_stream_persist._FLUSH_DEBOUNCE_SEC", 0.01
    )
    monkeypatch.setattr("app.agent.tools.chapter_stream_persist._MIN_FLUSH_CHARS", 1)

    appender = StreamingChapterAppender(_ctx(), title="第一章", stream_input={})
    await appender.append_delta("body text " * 50)
    await asyncio.sleep(0.05)

    patch, err = await appender.finalize()
    assert err == "HTTP 500 upstream"
    assert patch.get("chapter_persist_failures")
    assert patch["chapter_persist_failures"][0]["error"] == "HTTP 500 upstream"


@pytest.mark.asyncio
async def test_streaming_appender_empty_body_noop(monkeypatch):
    async def _fake_persist(ctx, cw):  # pragma: no cover - should not be called
        raise AssertionError("persist should not run for empty body")

    monkeypatch.setattr(
        "app.agent.backend.chapter_client.persist_chapter_write", _fake_persist
    )
    appender = StreamingChapterAppender(_ctx(), title="第一章", stream_input={})
    patch, err = await appender.finalize()
    assert err is None
    assert patch == {}
