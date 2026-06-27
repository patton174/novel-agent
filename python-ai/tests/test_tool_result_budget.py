"""Tests for CC applyToolResultBudget (API-adapted)."""

from langchain_core.messages import AIMessage, ToolMessage

from app.agent.context.tool_result_budget import (
    ContentReplacementState,
    enforce_tool_result_budget,
    provision_content_replacement_state,
)


def test_budget_replaces_oversized_round():
    big = "x" * 150_000
    messages = [
        AIMessage(
            content="",
            tool_calls=[
                {"id": "a", "name": "ListChapters", "args": {}},
                {"id": "b", "name": "ListChapters", "args": {}},
            ],
        ),
        ToolMessage(content=big, tool_call_id="a"),
        ToolMessage(content=big, tool_call_id="b"),
    ]
    state = ContentReplacementState()
    result = enforce_tool_result_budget(messages, state)
    assert result.changed
    assert result.replaced_count >= 1
    bodies = [str(m.content) for m in messages if isinstance(m, ToolMessage)]
    assert any("<persisted-output>" in b for b in bodies)


def test_budget_skips_read_chapter():
    big = "x" * 150_000
    messages = [
        AIMessage(
            content="",
            tool_calls=[{"id": "r1", "name": "ReadChapter", "args": {}}],
        ),
        ToolMessage(content=big, tool_call_id="r1"),
    ]
    state = ContentReplacementState()
    result = enforce_tool_result_budget(messages, state)
    assert not result.changed
    assert messages[1].content == big


def test_provision_freezes_hydrated_tools():
    messages = [
        AIMessage(
            content="",
            tool_calls=[{"id": "a", "name": "ListChapters", "args": {}}],
        ),
        ToolMessage(content="prior body", tool_call_id="a"),
    ]
    state = provision_content_replacement_state(messages)
    assert "a" in state.seen_ids
    big = "y" * 150_000
    messages.extend(
        [
            AIMessage(
                content="",
                tool_calls=[{"id": "b", "name": "ListChapters", "args": {}}],
            ),
            ToolMessage(content=big, tool_call_id="b"),
        ]
    )
    enforce_tool_result_budget(messages, state)
    assert messages[1].content == "prior body"
