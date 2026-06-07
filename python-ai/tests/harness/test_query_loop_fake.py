"""Fake-LLM harness: bind_tools → ListChapters → end."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from langchain_core.messages import AIMessage

from app.agent.loop import run_query_loop
from app.agent.schemas import AgentRunContext, RunRequest, StepRequest
from app.agent.harness.loop_support import ToolStepOutcome
from app.runtime.events import build_event


def _ctx(**overrides) -> AgentRunContext:
    base = {
        "run_id": "run_harness",
        "session_id": "session_harness",
        "message_id": "message_harness",
        "user_id": 1,
        "mode": "auto",
        "user_message": "请简要说明设定",
        "novel_id": "novel-1",
    }
    base.update(overrides)
    return AgentRunContext(**base)


async def _fake_run_step(req: StepRequest) -> AsyncIterator[dict[str, Any]]:
    tool = (req.tool or "").strip()
    ctx = req.context
    if tool == "ListChapters":
        yield build_event(
            event_type="step.completed",
            run_id=ctx.run_id,
            session_id=ctx.session_id,
            message_id=ctx.message_id,
            step_id="step_list",
            sequence=1,
            payload={
                "step_kind": "ListChapters",
                "action": "continue",
                "next_tool": "",
                "next_input": {},
                "context_patch": {},
                "display": {
                    "type": "tool",
                    "tool": "ListChapters",
                    "content": '{"chapters": []}',
                },
                "reason": "ok",
            },
            persist=False,
        )
        return
    raise AssertionError(f"unexpected tool in harness: {tool}")


@pytest.mark.asyncio
async def test_fake_query_loop_bind_tools_output():
    req = RunRequest(context=_ctx())
    types: list[str] = []

    first = AIMessage(
        content="",
        tool_calls=[
            {
                "name": "ListChapters",
                "args": {},
                "id": "call_list_1",
                "type": "tool_call",
            }
        ],
    )
    second = AIMessage(content="")
    responses = [first, second]

    mock_llm = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm

    async def _fake_bind_stream(*_a, **_k):
        msg = responses.pop(0)
        yield msg

    with (
        patch(
            "app.agent.loop._enrich_context",
            side_effect=lambda c, **_: c,
        ),
        patch(
            "app.agent.loop.llm_provider.get_llm",
            return_value=mock_llm,
        ),
        patch(
            "app.agent.loop.stream_bind_tools_turn",
            side_effect=_fake_bind_stream,
        ),
        patch(
            "app.agent.loop.stream_tool_step",
            side_effect=_fake_stream_tool_step,
        ),
    ):
        async for ev in run_query_loop(req):
            types.append(str(ev.get("type")))

    assert "planning.next_step" in types
    assert "planning.completed" in types
    assert "step.completed" in types


async def _fake_stream_tool_step(ctx, tool, tool_input, *, sequence, outcome, step_id=None):
    async for ev in _fake_run_step(
        StepRequest(context=ctx, tool=tool, tool_input=tool_input)
    ):
        if ev.get("type") == "step.completed":
            from app.agent.schemas import DisplayPayload, StepResult

            payload = ev.get("payload") if isinstance(ev.get("payload"), dict) else {}
            outcome.result = StepResult(
                step_kind=str(payload.get("step_kind") or tool),
                action=payload.get("action") or "continue",
                next_tool=str(payload.get("next_tool") or ""),
                next_input=dict(payload.get("next_input") or {}),
                context_patch=dict(payload.get("context_patch") or {}),
                display=DisplayPayload.model_validate(payload.get("display") or {}),
                reason=str(payload.get("reason") or "ok"),
            )
            outcome.tool_output = str((outcome.result.display.content or ""))
        yield ev
