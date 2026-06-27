"""Profile-aware subagent tests."""

from __future__ import annotations

import pytest

from app.agent.harness.subagent import build_subagent_context, run_subagent
from app.agent.harness.subagent_policy import subagent_depth
from app.agent.harness.subagent_sse import stream_subagent_tool
from app.agent.schemas import AgentRunContext
from app.agent.tools.registry import get_all_tools, tools_for_profile
from app.agent.harness.profile_loader import load_bundled_profile, resolve_profile_sync
from app.config import settings


def _parent_ctx(**patch) -> AgentRunContext:
    return AgentRunContext(
        run_id="run_parent",
        session_id="sess",
        message_id="msg",
        user_id=1,
        novel_id="novel-1",
        mode="write",
        user_message="全书整理",
        context_patch=patch,
    )


def test_depth_two_rejects_nested_agent():
    parent = build_subagent_context(_parent_ctx(), description="外层", prompt="做A")
    nested = build_subagent_context(parent, description="内层", prompt="做B")
    assert subagent_depth(nested) == 2
    assert subagent_depth(nested) >= settings.agent_subagent_max_depth


@pytest.mark.asyncio
async def test_run_subagent_depth_two_is_error():
    parent = build_subagent_context(_parent_ctx(), description="外层", prompt="做A")
    nested_parent = build_subagent_context(parent, description="内层", prompt="做B")
    result = await run_subagent(
        nested_parent,
        description="嵌套",
        prompt="不应执行",
        profile_id="chapter-writer",
    )
    assert result.is_error
    assert "禁止嵌套" in result.content or "嵌套" in result.content


def test_style_editor_allowlist_excludes_write_chapter():
    profile = resolve_profile_sync("style-editor")
    names = {t.name for t in tools_for_profile(profile, get_all_tools())}
    assert "EditChapter" in names
    assert "WriteChapter" not in names


def test_continuity_reviewer_bundled_profile():
    profile = load_bundled_profile("continuity-reviewer")
    assert profile is not None
    names = {t.name for t in tools_for_profile(profile, get_all_tools())}
    assert "NarrativeReview" in names
    assert "WriteChapter" not in names


@pytest.mark.asyncio
async def test_subagent_sse_started_payload_has_profile_id(monkeypatch):
    async def _fake_stream_child(*_a, **_k):
        if False:
            yield {}

    async def _noop_loop(_req):
        if False:
            yield {}

    monkeypatch.setattr(
        "app.agent.harness.subagent_sse._stream_child_subagent_run",
        _fake_stream_child,
    )
    monkeypatch.setattr("app.agent.loop.run_query_loop", _noop_loop)

    ctx = _parent_ctx()
    events = []
    async for ev in stream_subagent_tool(
        ctx,
        {
            "description": "写第1章",
            "prompt": "仅写第一章",
            "profile_id": "chapter-writer",
        },
        parent_step_id="step_agent_1",
        sequence=0,
    ):
        events.append(ev)

    started = next(e for e in events if e.get("type") == "subagent.started")
    payload = started.get("payload") or {}
    assert payload.get("profile_id") == "chapter-writer"
    assert payload.get("display_name")
