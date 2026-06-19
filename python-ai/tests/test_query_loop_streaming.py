"""Ensure query loop forwards tool step events without buffering."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any
from unittest.mock import patch

import pytest

from app.agent.harness.loop_support import ToolStepOutcome, stream_tool_step
from app.agent.schemas import AgentRunContext


async def _fake_read_stream(
    ctx: AgentRunContext,
    tool: str,
    tool_input: dict,
    *,
    sequence: int,
    step_id: str | None = None,
) -> AsyncIterator[dict[str, Any]]:
    assert tool == "ReadChapter"
    yield {"type": "step.started", "payload": {"tool": "ReadChapter"}}
    yield {
        "type": "tool.completed",
        "payload": {"name": "ReadChapter", "output": "ok"},
    }
    yield {
        "type": "step.completed",
        "payload": {
            "step_kind": "ReadChapter",
            "action": "continue",
            "next_tool": "",
            "next_input": {},
            "context_patch": {},
            "reason": "ok",
        },
    }


async def _fake_chapter_stream(
    ctx: AgentRunContext,
    tool: str,
    tool_input: dict,
    *,
    sequence: int,
    step_id: str | None = None,
) -> AsyncIterator[dict[str, Any]]:
    assert tool == "WriteChapter"
    yield {"type": "step.started", "payload": {"tool": "WriteChapter"}}
    yield {"type": "tool.started", "payload": {"name": "WriteChapter"}}
    yield {"type": "chapter.stream.started", "payload": {"title": "第一章"}}
    await asyncio.sleep(0.05)
    yield {"type": "chapter.stream.delta", "payload": {"text": "开篇"}}
    await asyncio.sleep(0.05)
    yield {"type": "chapter.stream.delta", "payload": {"text": "正文"}}
    yield {"type": "chapter.stream.completed", "payload": {}}
    yield {
        "type": "tool.completed",
        "payload": {"name": "WriteChapter", "content": "ok"},
    }
    yield {
        "type": "step.completed",
        "payload": {
            "step_kind": "WriteChapter",
            "action": "continue",
            "next_tool": "",
            "next_input": {},
            "context_patch": {},
            "reason": "ok",
        },
    }


@pytest.mark.asyncio
async def test_stream_tool_step_yields_events_incrementally():
    ctx = AgentRunContext(
        run_id="run_test",
        session_id="session_test",
        message_id="message_test",
        user_id=1,
        novel_id="novel-1",
        user_message="续写",
        mode="auto",
    )
    outcome = ToolStepOutcome()
    seen_types: list[str] = []

    with patch(
        "app.agent.harness.loop_support.stream_cc_tool_step",
        side_effect=_fake_read_stream,
    ):
        async for ev in stream_tool_step(
            ctx, "ReadChapter", {"chapter_id": "c1"}, sequence=0, outcome=outcome
        ):
            seen_types.append(str(ev.get("type")))

    assert "step.started" in seen_types
    assert "step.completed" in seen_types


@pytest.mark.asyncio
async def test_stream_tool_step_forwards_chapter_deltas_before_completion():
    ctx = AgentRunContext(
        run_id="run_test",
        session_id="session_test",
        message_id="message_test",
        user_id=1,
        novel_id="novel-1",
        user_message="写第一章",
        mode="auto",
    )
    outcome = ToolStepOutcome()
    timeline: list[str] = []

    with patch(
        "app.agent.harness.loop_support.stream_cc_tool_step",
        side_effect=_fake_chapter_stream,
    ):
        async for ev in stream_tool_step(
            ctx, "WriteChapter", {"title": "第一章"}, sequence=0, outcome=outcome
        ):
            timeline.append(str(ev.get("type")))

    started_idx = timeline.index("tool.started")
    delta_idx = timeline.index("chapter.stream.delta")
    completed_idx = timeline.index("chapter.stream.completed")
    step_done_idx = timeline.index("step.completed")
    assert started_idx < delta_idx < completed_idx < step_done_idx
