"""Tests for query-loop transcript."""

from app.agent_step.schemas import DisplayPayload, StepResult
from app.agent_step.transcript import AgentTranscript, apply_interaction_to_context


def test_transcript_clears_pending_confirm_after_interaction():
    t = AgentTranscript()
    t.append_think("## 待确认\n1. 角色库？")
    assert t.has_pending_confirm_after_think() is True
    t.append_interaction({"answers": {"q1": {"choice": {"title": "已有角色卡"}}}})
    assert t.has_pending_confirm_after_think() is False


def test_transcript_tool_result():
    t = AgentTranscript()
    result = StepResult(
        step_kind="memory_read",
        action="continue",
        next_input={},
        context_patch={},
        display=DisplayPayload(type="tool", tool="memory_read", content="角色库共 9 人"),
        reason="ok",
    )
    t.append_tool_result("memory_read", result)
    rows = t.format_for_plan()
    assert rows[-1]["kind"] == "tool"
    assert "9 人" in rows[-1]["summary"]


def test_apply_interaction_patch():
    patch = apply_interaction_to_context(
        {},
        {"answers": {"q1": {"choice": {"title": "结构框架优先"}}}},
    )
    assert "user_interactions" in patch
