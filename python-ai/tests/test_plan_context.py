"""Tests for JSON plan context assembly."""

import json

from app.agent.harness.orchestration_contract import build_main_loop_system_prompt, context_decision_hints
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


def test_summarize_memory_read_memory_id_only():
    raw = {
        "ok": True,
        "scope": "character",
        "memory_id": "mem-123",
    }
    compact = summarize_memory_read(raw)
    assert compact == {"ok": True, "scope": "character", "memory_id": "mem-123"}


def test_has_character_roster_snapshot():
    patch = {
        "character_roster": ["苏夜"],
        "last_memory_read": {"ok": True, "scope": "character", "memory_id": "m1"},
    }
    assert has_character_roster_snapshot(patch) is True
    assert has_character_roster_snapshot({}) is False


def test_build_plan_context_bounded_slots():
    req = PlanRequest(
        context=_ctx(
            step_index=12,
            last_tool="DeleteMemory",
            last_reason="memory delete",
            context_patch={
                "character_roster": ["唐云", "苏夜"],
                "last_memory_read": summarize_memory_read(
                    {
                        "ok": True,
                        "scope": "character",
                        "memory_id": "m-char",
                    }
                ),
                "memory_ops_log": [
                    {"tool": "DeleteMemory", "ok": True, "memory_id": "m-old", "summary": "ok"},
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
    assert ctx_json["session"]["think"] == "x" * 4000
    assert ctx_json["memory"]["character_roster"] == ["唐云", "苏夜"]
    assert ctx_json["memory"]["last_read"]["memory_id"] == "m-char"
    assert len(ctx_json["session"]["think"]) == 4000


def test_build_plan_context_think_pending_confirm_flag():
    long_tail = "\n\n四、待确认点\n1. 破晓小队性质？"
    think = ("分析正文 " * 200) + long_tail
    req = PlanRequest(
        context=_ctx(),
        think_content=think,
        think_tool_input={"question": "优化角色库"},
    )
    ctx_json = build_plan_context(req)
    assert ctx_json["session"]["think"] == think
    assert ctx_json["session"]["think_has_pending_confirm"] is True
    assert "待确认点" in ctx_json["session"]["think"]


def test_main_loop_system_prompt_non_empty():
    text = build_main_loop_system_prompt()
    assert len(text) < 7500
    assert "ListChapters" in text
    assert "WriteChapter" in text


def test_context_decision_hints_memory_child_requires_parent_or_scope():
    hints = context_decision_hints()
    memory = hints.get("memory") or ""
    assert "parent_id" in memory
    assert "scope" in memory
    assert "required" in memory.lower() or "必填" in memory or "one required" in memory


def test_format_plan_context_message_roundtrip():
    req = PlanRequest(context=_ctx(), think_content="", think_tool_input={})
    text = format_plan_context_message(req)
    assert "RUN_CONTEXT_JSON:" in text
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
