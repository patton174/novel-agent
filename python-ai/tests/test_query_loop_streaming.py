"""Ensure query loop forwards tool step events without buffering."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any
from unittest.mock import patch

import pytest

from app.agent_step.query_loop_support import ToolStepOutcome, stream_tool_step
from app.agent_step.schemas import AgentRunContext


async def _fake_read_stream(
    ctx: AgentRunContext, tool: str, tool_input: dict, *, sequence: int
) -> AsyncIterator[dict[str, Any]]:
    assert tool == "Read"
    yield {"type": "step.started", "payload": {"tool": "Read"}}
    yield {
        "type": "tool.completed",
        "payload": {"name": "Read", "output": "ok"},
    }
    yield {
        "type": "step.completed",
        "payload": {
            "step_kind": "Read",
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
        "app.agent_step.query_loop_support.stream_cc_tool_step",
        side_effect=_fake_read_stream,
    ):
        async for ev in stream_tool_step(
            ctx, "Read", {"file_path": "/novel/novel-1/meta.json"}, sequence=0, outcome=outcome
        ):
            seen_types.append(str(ev.get("type")))

    assert "step.started" in seen_types
    assert "step.completed" in seen_types
