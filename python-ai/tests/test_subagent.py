"""Subagent context, tool filter, and event summarization."""

import pytest

from app.agent.harness.subagent import (
    _extract_subagent_visible_text,
    _summarize_subagent_events,
    build_subagent_context,
)
from app.agent.harness.subagent_policy import SUBAGENT_EXCLUDED_TOOLS, subagent_depth
from app.agent.schemas import AgentRunContext
from app.agent.tools.registry import get_all_tools, is_tool_discovered


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
    assert "ReadChapter" in names
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
            "type": "message.delta",
            "payload": {"text": "不应进入模型 ToolMessage 的流式噪音"},
        },
        {
            "type": "message.completed",
            "payload": {"role": "assistant"},
        },
    ]
    text, err = _summarize_subagent_events(
        "迁移1-2章",
        events,
        delivery_text="第1-2章迁移完成。",
    )
    assert not err
    assert "第1-2章迁移完成" in text
    assert "不应进入模型" not in text
    assert "第2章" in text
    assert "## 子任务完成" not in text
    assert "模型侧摘要" not in text
    assert "**回复正文**" in text


def test_summarize_subagent_events_warns_but_not_failed_when_delivery_and_error():
    events = [
        {
            "type": "run.failed",
            "payload": {
                "error": '<tool_use_error code="MEMORY_ITEM_NOT_FOUND">memory node not found</tool_use_error>',
            },
        },
    ]
    text, err = _summarize_subagent_events(
        "读记忆",
        events,
        delivery_text="## 记忆汇总\n\n完整交付",
    )
    assert not err
    assert "**状态**：已完成（子 Agent run）" in text
    assert "**状态**：失败" not in text
    assert "memory node not found" in text
    assert "## 记忆汇总" in text


def test_summarize_subagent_events_includes_full_delivery_not_2400_cap():
    long_delivery = "章节汇总：" + ("正文段落。" * 800)
    text, err = _summarize_subagent_events(
        "读章汇总",
        [],
        delivery_text=long_delivery,
    )
    assert not err
    assert long_delivery in text
    assert "full report in UI" not in text


def test_extract_subagent_visible_text_from_message_deltas():
    events = [
        {"type": "message.delta", "payload": {"text": "## 章节报告\n\n"}},
        {"type": "message.delta", "payload": {"text": "第1章摘要内容。"}},
        {"type": "message.completed", "payload": {"role": "assistant"}},
    ]
    body = _extract_subagent_visible_text(events)
    assert "章节报告" in body
    assert "第1章摘要" in body


def test_summarize_subagent_events_reads_step_kind_payload():
    events = [
        {
            "type": "step.completed",
            "payload": {
                "step_kind": "ReadMemory",
                "reason": "世界观节点正文摘要…",
            },
        },
    ]
    text, err = _summarize_subagent_events("读记忆", events)
    assert not err
    assert "世界观节点正文摘要" in text
    assert "未产生可见输出" not in text


@pytest.mark.asyncio
async def test_agent_call_rejects_nested_subagent():
    from app.agent.harness.subagent import run_subagent

    child = build_subagent_context(_parent_ctx(), description="内层", prompt="任务")
    result = await run_subagent(child, description="嵌套", prompt="不应执行")
    assert result.is_error
    assert "禁止嵌套" in result.content
