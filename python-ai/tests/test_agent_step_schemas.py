"""Tests for agent step schemas."""

import pytest
from pydantic import ValidationError

from app.agent_step.schemas import DisplayPayload, StepResult


def test_step_result_continue_allows_empty_next_tool():
    result = StepResult(
        step_kind="think",
        action="continue",
        next_input={},
        context_patch={},
        display=DisplayPayload(type="think", content="分析"),
        reason="handoff to java plan",
    )
    assert result.next_tool == ""


def test_step_result_end_requires_end_tool():
    result = StepResult(
        step_kind="output",
        action="end",
        next_tool="end",
        next_input={},
        context_patch={},
        display=DisplayPayload(type="message", content="正文"),
        reason="done",
    )
    assert result.next_tool == "end"


def test_step_result_rejects_missing_dict_fields():
    with pytest.raises(ValidationError):
        StepResult.model_validate(
            {
                "step_kind": "output",
                "action": "continue",
                "next_tool": "end",
                "display": {"type": "message", "content": "x"},
                "reason": "bad",
            }
        )


def test_step_result_rejects_null_dict_fields():
    with pytest.raises(ValidationError):
        StepResult.model_validate(
            {
                "step_kind": "output",
                "action": "continue",
                "next_tool": "end",
                "next_input": None,
                "context_patch": {},
                "display": {"type": "message", "content": "x"},
                "reason": "bad",
            }
        )


def test_step_result_wait_requires_interaction():
    with pytest.raises(ValidationError):
        StepResult(
            step_kind="choose",
            action="wait",
            next_tool="",
            next_input={},
            context_patch={},
            display=DisplayPayload(type="tool", tool="choose"),
            reason="test",
        )


def test_step_result_wait_valid():
    result = StepResult(
        step_kind="choose",
        action="wait",
        wait_for="interaction",
        next_input={},
        context_patch={},
        display=DisplayPayload(
            type="tool",
            tool="choose",
            interaction={"type": "single_select", "options": []},
        ),
        reason="wait user",
    )
    assert result.action == "wait"


def test_step_result_end():
    result = StepResult(
        step_kind="end",
        action="end",
        next_tool="end",
        next_input={},
        context_patch={},
        display=DisplayPayload(type="none"),
        reason="done",
    )
    assert result.next_tool == "end"
