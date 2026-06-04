"""Subagent context, tool filter, and event summarization."""

import pytest

from app.agent_step.schemas import AgentRunContext
from app.agent_step.subagent import (
    _summarize_subagent_events,
    build_subagent_context,
)
from app.agent_step.subagent_policy import SUBAGENT_EXCLUDED_TOOLS, subagent_depth
from app.agent_step.tools.registry import get_all_tools, is_tool_discovered


def _parent_ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="run_parent",
        session_id="sess",
        message_id="msg",
        user_id=1,
        novel_id="novel-1",
        mode="write",
        user_message="全书整理",
        chapters=[{"id": "c1", "title": "第1章"}],
    )


def test_build_subagent_context_increments_depth():
    child = build_subagent_context(
        _parent_ctx(), description="迁移记忆", prompt="仅第1-2章"
    )
    assert subagent_depth(child) == 1
    assert child.user_message == "仅第1-2章"
    assert child.run_id != "run_parent"
    assert child.context_patch.get("_subagent_disable_defer") is True


def test_subagent_excludes_agent_and_ask_user():
    child = build_subagent_context(_parent_ctx(), description="x", prompt="y")
    names = {t.name for t in get_all_tools(child)}
    assert "Read" in names
    assert "Agent" not in names
    assert "AskUser" not in names
    assert "Agent" in SUBAGENT_EXCLUDED_TOOLS


def test_subagent_skips_tool_search_gate():
    child = build_subagent_context(_parent_ctx(), description="x", prompt="y")
    assert is_tool_discovered(child, "WebFetch") is True


def test_summarize_subagent_events():
    events = [
        {
            "type": "step.completed",
            "payload": {
                "tool": "Write",
                "title": "写入记忆",
                "display_excerpt": "第2章已写入章节记忆",
            },
        },
        {
            "type": "message.completed",
            "payload": {"content": "第1-2章迁移完成。"},
        },
    ]
    text, err = _summarize_subagent_events("迁移1-2章", events)
    assert not err
    assert "第1-2章迁移完成" in text
    assert "第2章" in text


@pytest.mark.asyncio
async def test_agent_call_rejects_nested_subagent():
    from app.agent_step.subagent import run_subagent

    child = build_subagent_context(_parent_ctx(), description="内层", prompt="任务")
    result = await run_subagent(child, description="嵌套", prompt="不应执行")
    assert result.is_error
    assert "禁止嵌套" in result.content
