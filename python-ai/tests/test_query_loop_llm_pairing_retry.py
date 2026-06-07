"""LLM 400 tool pairing errors should repair history and retry, not fail immediately."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from langchain_core.messages import AIMessage

from app.agent.loop import run_query_loop
from app.agent.schemas import AgentRunContext, RunRequest


def _ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="run_pair",
        session_id="session_pair",
        message_id="message_pair",
        user_id=1,
        mode="auto",
        user_message="继续写",
    )


@pytest.mark.asyncio
async def test_query_loop_retries_after_tool_pairing_400():
    req = RunRequest(context=_ctx())
    types: list[str] = []
    attempts = {"n": 0}

    async def _flaky_stream(*_a, **_k):
        attempts["n"] += 1
        if attempts["n"] == 1:
            raise Exception(
                "Error code: 400 - tool call and result not match (2013)"
            )
        yield AIMessage(content="好的，继续。")

    mock_llm = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm

    with (
        patch("app.agent.loop._enrich_context", side_effect=lambda c, **_: c),
        patch("app.agent.loop.llm_provider.get_llm", return_value=mock_llm),
        patch(
            "app.agent.loop.stream_bind_tools_turn",
            side_effect=_flaky_stream,
        ),
        patch(
            "app.agent.loop.enrich_context_for_run",
            side_effect=lambda c, **_: c,
        ),
    ):
        async for ev in run_query_loop(req):
            types.append(str(ev.get("type")))

    assert attempts["n"] == 2
    assert "planning.failed" not in types
    assert "run.failed" not in types
