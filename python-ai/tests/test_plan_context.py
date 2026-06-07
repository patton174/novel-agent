"""Tests for JSON plan context assembly."""

import json

from app.agent.context.compact import compact_story_memory_text
from app.agent.harness.orchestration_contract import build_main_loop_system_prompt
from app.agent.harness.plan_context import (
    build_plan_context,
    format_plan_context_message,
    has_character_roster_snapshot,
    summarize_memory_read,
)
from app.agent.schemas import AgentRunContext, PlanRequest


def _ctx(**overrides) -> AgentRunContext:
    base = {
        "run_id": "run_test",
        "session_id": "session_test",
        "message_id": "message_test",
        "user_id": 1,
        "mode": "continue",
        "user_message": "优化角色库",
    }
    base.update(overrides)
    return AgentRunContext(**base)


def test_summarize_memory_read_strips_full_entries():
    raw = {
        "ok": True,
        "scope": "character",
        "item_ids": ["唐云", "苏夜"],
        "count": 2,
        "entries": {
            "唐云": {"人物卡": "x" * 5000, "身份": "主角"},
            "苏夜": {"人物卡": "y" * 5000},
        },
    }
    compact = summarize_memory_read(raw)
    assert compact["ok"] is True
    assert compact["item_ids"] == ["唐云", "苏夜"]
    assert "entries" not in compact
    assert len(compact["previews"]["唐云"]) <= 520
    assert compact.get("roster_loaded") is True
    assert "身份:主角" in compact["previews"]["唐云"]


def test_has_character_roster_snapshot():
    patch = {
        "character_roster": ["苏夜"],
        "last_memory_read": {"ok": True, "scope": "character", "roster_loaded": True},
    }
    assert has_character_roster_snapshot(patch) is True
    assert has_character_roster_snapshot({}) is False


def test_build_plan_context_story_snapshot_when_set():
    req = PlanRequest(
        context=_ctx(story_memory="世界观:\n- 力量体系: 灵气修炼"),
        context_patch={"character_roster": ["苏夜", "唐云"]},
    )
    ctx_json = build_plan_context(req)
    assert "story_snapshot" in ctx_json["memory"]
    assert "力量体系" in ctx_json["memory"]["story_snapshot"]


def test_build_plan_context_bounded_slots():
    req = PlanRequest(
        context=_ctx(
            step_index=12,
            last_tool="memory_delete",
            last_reason="memory delete",
            story_memory="世界观设定:\n- 框架: 虚界降临",
            context_patch={
                "character_roster": ["唐云", "苏夜"],
                "last_memory_read": summarize_memory_read(
                    {
                        "ok": True,
                        "scope": "character",
                        "item_ids": ["唐云", "苏夜"],
                        "count": 2,
                    }
                ),
                "memory_ops_log": [
                    {"tool": "memory_delete", "ok": True, "item_id": "女主", "summary": "ok"},
                ],
                "think_summary": "清理重复女主",
            },
        ),
        think_content="x" * 5000,
        think_tool_input={},
    )
    ctx_json = build_plan_context(req)
    assert ctx_json["run"]["step_index"] == 12
    assert ctx_json["intent"]["user_message"] == "优化角色库"
    assert ctx_json["think"] == "x" * 5000
    assert ctx_json["memory"]["character_roster"] == ["唐云", "苏夜"]
    assert "entries" not in ctx_json["memory"]["last_read"]
    assert len(ctx_json["think"]) == 5000
    assert ctx_json["memory"]["story_snapshot"] == compact_story_memory_text(
        "世界观设定:\n- 框架: 虚界降临"
    )


def test_build_plan_context_think_pending_confirm_flag():
    long_tail = "\n\n四、待确认点\n1. 破晓小队性质？"
    think = ("分析正文 " * 200) + long_tail
    req = PlanRequest(
        context=_ctx(),
        think_content=think,
        think_tool_input={"question": "优化角色库"},
    )
    ctx_json = build_plan_context(req)
    assert ctx_json["think"] == think
    assert ctx_json["think_has_pending_confirm"] is True
    assert "待确认点" in ctx_json["think"]


def test_main_loop_system_prompt_non_empty():
    text = build_main_loop_system_prompt()
    assert len(text) < 6000
    assert "ListChapters" in text
    assert "WriteChapter" in text


def test_format_plan_context_message_roundtrip():
    req = PlanRequest(context=_ctx(), think_content="", think_tool_input={})
    text = format_plan_context_message(req)
    assert "PLAN_CONTEXT_JSON:" in text
    assert "decision_hints" in json.loads(text.split("\n", 1)[1].split("\n\n")[0])


def test_build_plan_context_prior_output_from_last_reason():
    req = PlanRequest(
        context=_ctx(last_tool="output", last_reason="output continue"),
        think_content="",
        think_tool_input={},
    )
    ctx_json = build_plan_context(req)
    assert ctx_json["run"]["prior_output"] == "continue"

    req_done = PlanRequest(
        context=_ctx(last_tool="output", last_reason="output ok"),
        think_content="",
        think_tool_input={},
    )
    assert build_plan_context(req_done)["run"]["prior_output"] == "done"
