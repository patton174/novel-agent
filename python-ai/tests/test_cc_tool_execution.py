"""CC tool execution stack tests."""

from __future__ import annotations

import pytest

from app.agent.schemas import AgentRunContext
from app.agent.tools.registry import find_tool_by_name, get_tool_names, partition_concurrency_safe
from app.agent.tools.run_tool_use import run_tool_use
from app.agent.tools.run_tools import ToolUseItem, partition_tool_items, run_tools_batch
from app.agent.harness.tool_errors import format_no_such_tool_error


def _ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        novel_id="novel-1",
        project={"id": "novel-1", "title": "Test"},
        chapters=[{"id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "title": "第一章"}],
    )


def test_unknown_tool_error():
    import asyncio

    result = asyncio.run(run_tool_use("chapter_read", {"chapter_id": "x"}, _ctx()))
    assert result.is_error
    assert "No such tool available" in result.content


def test_list_chapters_concurrent():
    assert partition_concurrency_safe("ListChapters", {})
    batches = partition_tool_items(
        [
            ToolUseItem("a", "ListChapters", {}),
            ToolUseItem("b", "ReadChapter", {"chapter_id": "c1"}),
        ]
    )
    assert len(batches) >= 1


def test_registry_has_api_tools():
    names = get_tool_names()
    for t in ("ListChapters", "ReadChapter", "WriteChapter", "AskUser", "TodoWrite", "Agent"):
        assert t in names
    assert find_tool_by_name("Read") is None
    assert find_tool_by_name("chapter_list") is None
