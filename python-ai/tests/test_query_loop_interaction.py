"""Query loop continues after ask_user interaction (pause/resume)."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from app.agent_step.query_loop import _should_end_run_after_batch, _tool_batch_end_run
from app.agent_step.schemas import DisplayPayload, StepResult


def test_should_not_end_run_when_waited_even_if_continue_plan_false():
    assert (
        _should_end_run_after_batch(
            waited=True,
            batch_end_run=False,
            batch_had_terminal=True,
            continue_plan=False,
        )
        is False
    )


def test_ask_user_end_run_does_not_batch_end_run():
    result = StepResult(
        step_kind="ask_user",
        action="wait",
        wait_for="interaction",
        next_input={},
        context_patch={},
        display=DisplayPayload(type="tool", tool="ask_user", content="questions"),
        reason="wait",
    )
    assert _tool_batch_end_run("ask_user", {"end_run": True}, result) is False


def test_memory_only_batch_ends_run_when_continue_plan_false():
    assert (
        _should_end_run_after_batch(
            waited=False,
            batch_end_run=False,
            batch_had_terminal=False,
            continue_plan=False,
        )
        is True
    )


def test_continue_plan_true_memory_only_keeps_run_for_next_plan():
    assert (
        _should_end_run_after_batch(
            waited=False,
            batch_end_run=False,
            batch_had_terminal=False,
            continue_plan=True,
        )
        is False
    )


def test_output_end_run_does_not_batch_end_run():
    """Main loop no longer ends on tool end_run; only no-tool_use ends the run."""
    result = StepResult(
        step_kind="output",
        action="continue",
        next_input={},
        context_patch={},
        display=DisplayPayload(type="message", content="ok"),
        reason="ok",
    )
    assert _tool_batch_end_run("output", {"end_run": True}, result) is False


def test_step_result_action_end_detected_by_helper():
    result = StepResult(
        step_kind="memory_read",
        action="end",
        next_input={},
        context_patch={},
        display=DisplayPayload(type="tool", tool="memory_read", content="ok"),
        reason="ok",
    )
    assert _tool_batch_end_run("memory_read", {}, result) is True


def test_prepare_keeps_ask_user():
    from app.agent_step.schemas import AgentRunContext, PlanToolCall
    from app.agent_step.tool_prepare import prepare_execution_batch

    ctx = AgentRunContext(
        run_id="run_x",
        session_id="session_x",
        message_id="msg_x",
        user_id=1,
    )

    class _Ai:
        def __init__(self):
            self.tool_call_id = "t1"
            self.call = PlanToolCall(tool="AskUser", input={"questions": []})

    prepared = prepare_execution_batch(ctx, [_Ai()])
    assert prepared.items[0].tool == "AskUser"
