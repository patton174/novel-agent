"""Silent tool retry SSE filtering and eligibility."""

from __future__ import annotations

from app.agent.harness.tool_execution import (
    filter_tool_step_events_for_ui,
    is_failure_sse_event,
    is_silent_tool_retry_eligible,
)


def test_is_failure_sse_event_detects_tool_completed_error():
    ev = {
        "type": "tool.completed",
        "payload": {"failed": True, "content": "<tool_use_error>bad</tool_use_error>"},
    }
    assert is_failure_sse_event(ev) is True


def test_filter_hides_failure_while_retrying():
    buffered = [
        {"type": "tool.started", "payload": {}},
        {
            "type": "tool.completed",
            "payload": {"failed": True, "content": "<tool_use_error>x</tool_use_error>"},
        },
        {"type": "step.failed", "payload": {"error": "x"}},
    ]
    out = filter_tool_step_events_for_ui(
        buffered, attempt=1, will_retry=True, succeeded=False
    )
    assert [e["type"] for e in out] == ["tool.started"]


def test_filter_successful_retry_emits_completion_only():
    buffered = [
        {"type": "tool.started", "payload": {}},
        {"type": "step.started", "payload": {}},
        {"type": "tool.completed", "payload": {"failed": False, "content": "ok"}},
        {"type": "step.completed", "payload": {"reason": "ok"}},
    ]
    out = filter_tool_step_events_for_ui(
        buffered, attempt=2, will_retry=False, succeeded=True
    )
    assert [e["type"] for e in out] == ["tool.completed", "step.completed"]


def test_edit_chapter_old_string_error_is_silent_retry_eligible():
    assert is_silent_tool_retry_eligible(
        "EditChapter",
        None,
        executor_failed=True,
        executor_error="<tool_use_error>old_string not found</tool_use_error>",
    )
