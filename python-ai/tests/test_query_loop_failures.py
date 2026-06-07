"""Query loop failure handling: fatal vs recoverable tool errors."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from langchain_core.messages import AIMessage

from app.agent.loop import run_query_loop
from app.agent.schemas import AgentRunContext, RunRequest, StepRequest
from app.runtime.events import build_event


def _ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="run_fail",
        session_id="session_fail",
        message_id="message_fail",
        user_id=1,
        mode="auto",
        user_message="写小说",
        novel_id="novel-1",
    )


async def _read_chapter_fails(req: StepRequest) -> AsyncIterator[dict[str, Any]]:
    assert req.tool == "ReadChapter"
    ctx = req.context
    yield build_event(
        event_type="step.started",
        run_id=ctx.run_id,
        session_id=ctx.session_id,
        message_id=ctx.message_id,
        step_id="step_read",
        sequence=0,
        payload={"tool": "ReadChapter"},
        persist=False,
    )
    yield build_event(
        event_type="step.failed",
        run_id=ctx.run_id,
        session_id=ctx.session_id,
        message_id=ctx.message_id,
        step_id="step_read",
        sequence=1,
        payload={"error": "chapter not found", "retryable": False},
        persist=False,
    )


@pytest.mark.asyncio
async def test_query_loop_stops_after_tool_step_failed():
    """Fatal tool failures end the run."""
    req = RunRequest(context=_ctx())
    types: list[str] = []

    ai_response = AIMessage(
        content="",
        tool_calls=[
            {
                "name": "ReadChapter",
                "args": {"chapter_id": "missing"},
                "id": "call_read_1",
                "type": "tool_call",
            }
        ],
    )
    mock_llm = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm

    async def _fake_bind_stream(*_a, **_k):
        yield ai_response

    async def _fake_stream(ctx, tool, tool_input, *, sequence, outcome, step_id=None):
        req_inner = StepRequest(context=ctx, tool=tool, tool_input=tool_input)
        async for ev in _read_chapter_fails(req_inner):
            if ev.get("type") == "step.failed":
                payload = ev.get("payload") or {}
                outcome.failed = True
                outcome.error = str(payload.get("error") or "step failed")
            yield ev

    with (
        patch("app.agent.loop._enrich_context", side_effect=lambda c, **_: c),
        patch("app.agent.loop.llm_provider.get_llm", return_value=mock_llm),
        patch(
            "app.agent.loop.stream_bind_tools_turn",
            side_effect=_fake_bind_stream,
        ),
        patch("app.agent.loop.stream_tool_step", side_effect=_fake_stream),
    ):
        async for ev in run_query_loop(req):
            types.append(str(ev.get("type")))

    assert "step.failed" in types
    assert "run.failed" in types
