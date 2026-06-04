"""Tests for PlanResult dict normalization."""

from app.agent_step.llm_parse import (
    build_plan_dict_from_tool_calls,
    extract_plan_tool_calls_from_text,
    normalize_plan_dict,
    normalize_step_result_dict,
)


def test_normalize_string_next_input_for_output():
    data = normalize_plan_dict(
        {
            "action": "continue",
            "next_tool": "output",
            "next_input": "分析角色库",
            "reason": "reply",
        }
    )
    assert data["next_input"] == {"task": "分析角色库"}


def test_normalize_tool_calls_shorthand_shape():
    data = normalize_plan_dict(
        {
            "action": "continue",
            "tool_calls": [{"ask_user": {"topic": "请确认"}}],
            "reason": "ask",
        }
    )
    assert data["tool_calls"][0]["tool"] == "ask_user"
    assert data["next_tool"] == "ask_user"


def test_normalize_step_result_fills_missing_reason():
    data = normalize_step_result_dict(
        {
            "version": "1.0",
            "step_kind": "think",
            "action": "continue",
            "next_input": {},
            "context_patch": {},
            "display": {"type": "think", "content": "分析"},
        }
    )
    assert data["reason"] == "step done"


def test_extract_plan_tool_calls_keeps_memory_and_output():
    broken = (
        '{"action":"continue","tool_calls":['
        '{"tool":"memory_update","input":{"scope":"character","item_id":"萧无咎","key":"外貌","value":"儒雅"}},'
        '{"tool":"output","input":"补全完成，请查看。"}'
        '],"continue_plan":false,"reason":"batch"}'
    )
    calls = extract_plan_tool_calls_from_text(broken)
    assert len(calls) == 2
    assert calls[0]["tool"] == "memory_update"
    assert calls[1]["tool"] == "output"
    assert calls[1]["input"] == {"task": "补全完成，请查看。"}
    plan = build_plan_dict_from_tool_calls(calls, source_text=broken)
    assert plan is not None
    assert len(plan["tool_calls"]) == 2


def test_normalize_plan_dict_keeps_terminal_tool_in_memory_batch():
    data = normalize_plan_dict(
        {
            "action": "continue",
            "tool_calls": [
                {"tool": "memory_update", "input": {"scope": "character", "key": "x", "value": "y"}},
                {"tool": "output", "input": "done"},
            ],
            "reason": "batch",
        }
    )
    assert len(data["tool_calls"]) == 2
    assert data["tool_calls"][0]["tool"] == "memory_update"
    assert data["tool_calls"][1]["tool"] == "output"
    assert data["tool_calls"][1]["input"] == {"task": "done"}
