"""Read tool_result for the model must use full step.completed body, not SSE excerpt."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any
from unittest.mock import patch

import pytest

from app.agent_step.query_loop_support import ToolStepOutcome, stream_tool_step
from app.agent_step.schemas import AgentRunContext

_FULL = "x" * 5000
_EXCERPT = "《大纲》末法觉醒…"


async def _fake_chapter_read_stream(
    ctx: AgentRunContext, tool: str, tool_input: dict, *, sequence: int
) -> AsyncIterator[dict[str, Any]]:
    assert tool == "Read"
    yield {"type": "step.started", "payload": {"tool": "Read"}}
    yield {
        "type": "tool.completed",
        "payload": {
            "name": "Read",
            "display_excerpt": _EXCERPT,
            "output_summary": _EXCERPT,
        },
    }
    yield {
        "type": "step.completed",
        "payload": {
            "step_kind": "Read",
            "action": "continue",
            "next_tool": "",
            "next_input": {},
            "context_patch": {},
            "reason": _EXCERPT,
            "display": {"type": "tool", "tool": "Read", "content": _FULL},
        },
    }


@pytest.mark.asyncio
async def test_stream_tool_step_read_uses_full_step_completed_content():
    ctx = AgentRunContext(
        run_id="run_test",
        session_id="session_test",
        message_id="message_test",
        user_id=1,
        novel_id="novel-1",
        user_message="读大纲",
        mode="auto",
    )
    outcome = ToolStepOutcome()

    with patch(
        "app.agent_step.query_loop_support.stream_cc_tool_step",
        side_effect=_fake_chapter_read_stream,
    ):
        async for _ in stream_tool_step(
            ctx,
            "Read",
            {"file_path": "/novel/novel-1/memory/outline/book.md"},
            sequence=0,
            outcome=outcome,
        ):
            pass

    assert outcome.tool_output == _FULL
    assert outcome.result is not None
    assert outcome.result.display.content == _FULL
