"""Tests for CC-aligned tool-result microcompact (count trigger)."""

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.agent.context.compact_micro import (
    MICROCOMPACT_CLEARED_MESSAGE,
    collect_compactable_tool_ids,
    microcompact_messages,
)
from app.agent.context.policy import (
    microcompact_trigger_count,
    should_microcompact_messages,
)


def test_collect_compactable_tool_ids_order():
    messages = [
        AIMessage(
            content="",
            tool_calls=[
                {"id": "r1", "name": "ReadChapter", "args": {}},
                {"id": "x1", "name": "AskUser", "args": {}},
            ],
        ),
        ToolMessage(content="chapter body " * 100, tool_call_id="r1"),
        AIMessage(
            content="",
            tool_calls=[{"id": "r2", "name": "ListChapters", "args": {}}],
        ),
        ToolMessage(content="more text " * 50, tool_call_id="r2"),
    ]
    assert collect_compactable_tool_ids(messages) == ["r1", "r2"]


def test_microcompact_clears_old_keeps_recent_when_forced():
    messages = [
        SystemMessage(content="sys"),
        HumanMessage(content="hi"),
        AIMessage(
            content="",
            tool_calls=[{"id": "a", "name": "ListChapters", "args": {}}],
        ),
        ToolMessage(content="OLD " * 200, tool_call_id="a"),
        AIMessage(
            content="",
            tool_calls=[{"id": "b", "name": "ListChapters", "args": {}}],
        ),
        ToolMessage(content="KEEP " * 200, tool_call_id="b"),
        AIMessage(
            content="",
            tool_calls=[{"id": "c", "name": "ListChapters", "args": {}}],
        ),
        ToolMessage(content="NEWEST " * 200, tool_call_id="c"),
    ]
    result = microcompact_messages(messages, keep_recent=1, force=True)
    assert result.cleared_count == 2
    assert result.tokens_saved > 0
    assert messages[3].content == MICROCOMPACT_CLEARED_MESSAGE
    assert messages[5].content == MICROCOMPACT_CLEARED_MESSAGE
    assert "NEWEST" in str(messages[7].content)


def test_microcompact_noop_below_count_trigger():
    messages = [
        AIMessage(content="", tool_calls=[{"id": "a", "name": "ListChapters", "args": {}}]),
        ToolMessage(content="body", tool_call_id="a"),
    ]
    assert not should_microcompact_messages(messages)
    result = microcompact_messages(messages, keep_recent=1)
    assert result.cleared_count == 0
    assert messages[1].content == "body"


def test_microcompact_skips_already_cleared():
    messages = [
        AIMessage(content="", tool_calls=[{"id": "a", "name": "ListChapters", "args": {}}]),
        ToolMessage(content=MICROCOMPACT_CLEARED_MESSAGE, tool_call_id="a"),
        AIMessage(content="", tool_calls=[{"id": "b", "name": "ListChapters", "args": {}}]),
        ToolMessage(content="fresh", tool_call_id="b"),
    ]
    result = microcompact_messages(messages, keep_recent=1, force=True)
    assert result.cleared_count == 0


def _messages_with_n_compactable(n: int) -> list:
    msgs: list = [HumanMessage(content="hi")]
    for i in range(n):
        msgs.extend(
            [
                AIMessage(
                    content="",
                    tool_calls=[{"id": f"t{i}", "name": "ListChapters", "args": {}}],
                ),
                ToolMessage(content=f"body-{i}", tool_call_id=f"t{i}"),
            ]
        )
    return msgs


def test_should_microcompact_count_trigger():
    trigger = microcompact_trigger_count()
    assert not should_microcompact_messages(_messages_with_n_compactable(trigger))
    assert should_microcompact_messages(_messages_with_n_compactable(trigger + 1))
