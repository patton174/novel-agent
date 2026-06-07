"""Tests for autocompact (format/split; LLM path mocked)."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.agent.context.compact_autocompact import (
    autocompact_conversation,
    compact_boundary_line,
    format_compact_summary,
    split_messages_for_autocompact,
)
from app.agent.harness.transcript import AgentTranscript


def test_format_compact_summary_strips_analysis():
    raw = "<analysis>draft</analysis>\n<summary>\n## Done\n- wrote ch3\n</summary>"
    out = format_compact_summary(raw)
    assert "draft" not in out
    assert "wrote ch3" in out
    assert "Summary:" in out


def test_split_messages_head_body_tail():
    messages = [
        SystemMessage(content="sys"),
        HumanMessage(content="RUN_CONTEXT"),
        AIMessage(content="", tool_calls=[{"id": "t1", "name": "Read", "args": {}}]),
        ToolMessage(content="old", tool_call_id="t1"),
        AIMessage(content="recent"),
        HumanMessage(content="ok"),
    ]
    head, body, tail = split_messages_for_autocompact(messages, keep_tail=2)
    assert len(head) == 2
    assert len(body) == 2
    assert len(tail) == 2
    assert isinstance(tail[-1], HumanMessage)


def test_compact_boundary_line():
    assert "compact_boundary:auto" in compact_boundary_line(trigger="auto", pre_tokens=120_000)


@pytest.mark.asyncio
async def test_autocompact_conversation_rewrites_messages():
    messages = [
        SystemMessage(content="sys"),
        HumanMessage(content="ctx"),
    ]
    for i in range(6):
        tid = f"id{i}"
        messages.append(
            AIMessage(
                content="",
                tool_calls=[{"id": tid, "name": "Read", "args": {}}],
            )
        )
        messages.append(ToolMessage(content=f"body{i} " * 50, tool_call_id=tid))
    transcript = AgentTranscript()

    mock_resp = MagicMock()
    mock_resp.content = (
        "<summary>User asked to continue chapter 12. "
        "Previously Read ch1-11; Write ch12 started; pending audit.</summary>"
    )
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=mock_resp)

    with (
        patch(
            "app.agent.context.compact_autocompact.llm_provider.get_llm",
            return_value=mock_llm,
        ),
        patch(
            "app.agent.context.compact_autocompact.autocompact_keep_tail_messages",
            return_value=4,
        ),
    ):
        result = await autocompact_conversation(messages, transcript, trigger="auto")

    assert result.changed
    assert result.messages_removed > 0
    assert any(
        isinstance(m, SystemMessage)
        and "compact_boundary" in str(m.content)
        for m in messages
    )
    assert any(
        isinstance(m, HumanMessage)
        and "continue chapter 12" in str(m.content)
        for m in messages
    )
    assert len(transcript.entries) == 1
    assert transcript.entries[0].meta.get("autocompact")
