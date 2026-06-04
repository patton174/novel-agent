"""Tests for CC-aligned tool-result microcompact."""

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.agent_step.context_compact_micro import (
    MICROCOMPACT_CLEARED_MESSAGE,
    collect_compactable_tool_ids,
    microcompact_messages,
)
from app.agent_step.context_policy import (
    microcompact_threshold_tokens,
    should_microcompact_context,
)


def test_collect_compactable_tool_ids_order():
    messages = [
        AIMessage(
            content="",
            tool_calls=[
                {"id": "r1", "name": "Read", "args": {}},
                {"id": "x1", "name": "AskUser", "args": {}},
            ],
        ),
        ToolMessage(content="chapter body " * 100, tool_call_id="r1"),
        AIMessage(
            content="",
            tool_calls=[{"id": "r2", "name": "Read", "args": {}}],
        ),
        ToolMessage(content="more text " * 50, tool_call_id="r2"),
    ]
    assert collect_compactable_tool_ids(messages) == ["r1", "r2"]


def test_microcompact_clears_old_keeps_recent():
    messages = [
        SystemMessage(content="sys"),
        HumanMessage(content="hi"),
        AIMessage(
            content="",
            tool_calls=[{"id": "a", "name": "Read", "args": {}}],
        ),
        ToolMessage(content="OLD " * 200, tool_call_id="a"),
        AIMessage(
            content="",
            tool_calls=[{"id": "b", "name": "Glob", "args": {}}],
        ),
        ToolMessage(content="KEEP " * 200, tool_call_id="b"),
        AIMessage(
            content="",
            tool_calls=[{"id": "c", "name": "Grep", "args": {}}],
        ),
        ToolMessage(content="NEWEST " * 200, tool_call_id="c"),
    ]
    result = microcompact_messages(messages, keep_recent=1)
    assert result.cleared_count == 2
    assert result.tokens_saved > 0
    assert messages[3].content == MICROCOMPACT_CLEARED_MESSAGE
    assert messages[5].content == MICROCOMPACT_CLEARED_MESSAGE
    assert "NEWEST" in str(messages[7].content)


def test_microcompact_skips_already_cleared():
    messages = [
        AIMessage(content="", tool_calls=[{"id": "a", "name": "Read", "args": {}}]),
        ToolMessage(content=MICROCOMPACT_CLEARED_MESSAGE, tool_call_id="a"),
        AIMessage(content="", tool_calls=[{"id": "b", "name": "Read", "args": {}}]),
        ToolMessage(content="fresh", tool_call_id="b"),
    ]
    result = microcompact_messages(messages, keep_recent=1)
    assert result.cleared_count == 0


def test_should_microcompact_context_threshold():
    limit = microcompact_threshold_tokens()
    assert not should_microcompact_context(limit - 1000)
    assert should_microcompact_context(limit)
