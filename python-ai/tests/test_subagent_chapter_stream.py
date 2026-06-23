"""Subagent SSE forwards child events in real time."""

from __future__ import annotations

import pytest

from app.agent.harness.subagent_sse import (
    _map_child_to_subagent_progress,
    _should_forward_child_event,
)


def test_should_forward_child_tool_events():
    assert _should_forward_child_event(
        "tool.completed",
        {"name": "ReadChapter", "display_excerpt": "ok"},
    )
    assert not _should_forward_child_event("tool.completed", {"name": "think"})
    assert _should_forward_child_event(
        "message.completed",
        {"role": "assistant"},
    )


def test_map_child_to_subagent_progress_ignores_chapter_stream():
    assert (
        _map_child_to_subagent_progress(
            {"type": "chapter.stream.delta", "payload": {"text": "hello"}},
            parent_step_id="step_parent",
            child_run_id="child-1",
            description="write chapter",
        )
        is None
    )


@pytest.mark.asyncio
async def test_stream_subagent_forwards_chapter_stream_events(monkeypatch):
    from app.agent.harness.subagent_sse import stream_subagent_tool
    from app.agent.schemas import AgentRunContext

    async def fake_run_query_loop(_req):
        yield {
            "type": "chapter.stream.started",
            "payload": {"title": "测试章", "chapter_id": "c1"},
            "step_id": "child_step",
        }
        yield {
            "type": "chapter.stream.delta",
            "payload": {"text": "第一段"},
            "step_id": "child_step",
        }
        yield {
            "type": "chapter.stream.completed",
            "payload": {},
            "step_id": "child_step",
        }
        yield {
            "type": "tool.started",
            "step_id": "tool-1",
            "payload": {"name": "ReadChapter"},
        }
        yield {
            "type": "tool.completed",
            "step_id": "tool-1",
            "payload": {"name": "ReadChapter", "display_excerpt": "ok"},
        }
        yield {"type": "run.completed", "payload": {}}

    monkeypatch.setattr("app.agent.loop.run_query_loop", fake_run_query_loop)
    monkeypatch.setattr(
        "app.agent.harness.subagent_sse.build_subagent_context",
        lambda ctx, **_: ctx.model_copy(update={"run_id": f"{ctx.run_id}-sub-test"}),
    )

    ctx = AgentRunContext(
        run_id="run_test",
        session_id="session_test",
        message_id="msg_test",
        user_id=1,
        novel_id="novel-1",
        user_message="写一章",
    )
    events: list[dict] = []
    async for ev in stream_subagent_tool(
        ctx,
        {"description": "写章", "prompt": "写第一章"},
        parent_step_id="step_parent",
        sequence=1,
    ):
        events.append(ev)

    types = [e.get("type") for e in events]
    assert "chapter.stream.started" in types
    assert "chapter.stream.delta" in types
    assert "chapter.stream.completed" in types
    assert "subagent.event" in types
    assert "subagent.progress" in types
    progress_phases = [
        e.get("payload", {}).get("phase")
        for e in events
        if e.get("type") == "subagent.progress"
    ]
    assert "tool_started" in progress_phases
    assert "tool_done" in progress_phases
    child_types = [
        e.get("payload", {}).get("child_type")
        for e in events
        if e.get("type") == "subagent.event"
    ]
    assert "tool.started" in child_types
    assert "tool.completed" in child_types
