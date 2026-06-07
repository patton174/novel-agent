"""SSE vs model tool result separation."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any
from unittest.mock import patch

import pytest

from app.agent.harness.tool_result_routing import (
    build_model_step_payload,
    map_tool_result_for_model,
    model_text_from_sse_tool_completed,
    model_text_from_step_payload,
    tool_message_text,
)
from app.agent.tools.tool import ToolCallResult
from app.agent.harness.loop_support import ToolStepOutcome, stream_tool_step
from app.agent.schemas import AgentRunContext

_UI = "《大纲》摘要…"
_FULL = "line\n" * 400


def test_build_model_step_payload_carries_full_content():
    body = "x" * 3000
    payload = build_model_step_payload(
        "Read",
        ToolCallResult(content=body),
    )
    assert payload["display"]["content"] == body
    assert map_tool_result_for_model(ToolCallResult(content=body)) == body
    assert len(payload["reason"]) == 200


def test_model_text_from_step_payload_prefers_display_content():
    assert (
        model_text_from_step_payload(
            {"display": {"content": _FULL}, "reason": _UI}
        )
        == _FULL
    )


def test_sse_tool_completed_success_ignored_for_model():
    assert model_text_from_sse_tool_completed(
        {"status": "ok", "output": _UI, "output_summary": _UI}
    ) == ""


def test_sse_tool_completed_error_uses_output():
    err = "读取失败：HTTP 500"
    assert (
        model_text_from_sse_tool_completed(
            {"status": "error", "output": err}
        )
        == err
    )


def test_tool_message_text_prefers_longest_body():
    short = "摘要"
    long_body = "x" * 5000
    assert (
        tool_message_text(
            message_output=short,
            step_result_display_content=long_body,
        )
        == long_body
    )
    assert (
        tool_message_text(
            message_output="streamed " + ("y" * 8000),
            step_result_display_content=long_body,
        )
        == "streamed " + ("y" * 8000)
    )


async def _fake_glob_stream(
    ctx: AgentRunContext,
    tool: str,
    tool_input: dict,
    *,
    sequence: int,
    step_id: str | None = None,
) -> AsyncIterator[dict[str, Any]]:
    assert tool == "ListChapters"
    yield {"type": "step.started", "payload": {"tool": "ListChapters"}}
    yield {
        "type": "tool.completed",
        "payload": {
            "name": "ListChapters",
            "output": "2 项",
            "output_summary": "2 项",
        },
    }
    yield {
        "type": "step.completed",
        "payload": {
            "step_kind": "ListChapters",
            "action": "continue",
            "display": {"type": "tool", "tool": "ListChapters", "content": _FULL},
            "reason": "2 项",
        },
    }


@pytest.mark.asyncio
async def test_stream_tool_step_ignores_sse_output_on_success():
    ctx = AgentRunContext(
        run_id="run_test",
        session_id="session_test",
        message_id="message_test",
        user_id=1,
        novel_id="novel-1",
        user_message="列章节",
        mode="auto",
    )
    outcome = ToolStepOutcome()
    with patch(
        "app.agent.harness.loop_support.stream_cc_tool_step",
        side_effect=_fake_glob_stream,
    ):
        async for _ in stream_tool_step(
            ctx,
            "ListChapters",
            {},
            sequence=0,
            outcome=outcome,
        ):
            pass
    assert outcome.tool_output == _FULL
