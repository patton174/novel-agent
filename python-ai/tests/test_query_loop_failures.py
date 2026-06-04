"""Query loop failure handling: fatal vs recoverable tool errors."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage

from app.agent_step.query_loop import run_query_loop
from app.agent_step.schemas import AgentRunContext, RunRequest, StepRequest
from app.runtime.events import build_event


def _ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="run_fail",
        session_id="session_fail",
        message_id="message_fail",
        user_id=1,
        mode="auto",
        user_message="写小说",
    )


async def _think_fails(req: StepRequest) -> AsyncIterator[dict[str, Any]]:
    assert req.tool == "think"
    ctx = req.context
    yield build_event(
        event_type="think.started",
        run_id=ctx.run_id,
        session_id=ctx.session_id,
        message_id=ctx.message_id,
        step_id="step_think",
        sequence=0,
        payload={"title": "分析"},
        persist=False,
    )
    yield build_event(
        event_type="step.failed",
        run_id=ctx.run_id,
        session_id=ctx.session_id,
        message_id=ctx.message_id,
        step_id="step_think",
        sequence=1,
        payload={"error": "think LLM stream failed: timeout", "retryable": True},
        persist=False,
    )


@pytest.mark.asyncio
async def test_query_loop_stops_after_think_step_failed():
    """Executor/LLM hard failures still end the run."""
    req = RunRequest(context=_ctx())
    types: list[str] = []

    ai_response = AIMessage(
        content="",
        tool_calls=[
            {
                "name": "think",
                "args": {"question": "写小说"},
                "id": "call_think_1",
                "type": "tool_call",
            }
        ],
    )
    mock_llm = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm

    async def _fake_bind_stream(*_a, **_k):
        yield ai_response

    async def _fake_stream(ctx, tool, tool_input, *, sequence, outcome):
        req = StepRequest(context=ctx, tool=tool, tool_input=tool_input)
        async for ev in _think_fails(req):
            if ev.get("type") == "step.failed":
                payload = ev.get("payload") or {}
                outcome.failed = True
                outcome.error = str(payload.get("error") or "step failed")
            yield ev

    with (
        patch("app.agent_step.query_loop._enrich_context", side_effect=lambda c, **_: c),
        patch("app.agent_step.query_loop.llm_provider.get_llm", return_value=mock_llm),
        patch(
            "app.agent_step.query_loop.stream_bind_tools_turn",
            side_effect=_fake_bind_stream,
        ),
        patch("app.agent_step.query_loop.stream_tool_step", side_effect=_fake_stream),
    ):
        async for ev in run_query_loop(req):
            types.append(str(ev.get("type")))

    assert "step.failed" in types
    assert "run.failed" in types
