"""Tool visibility (aligned with frontend agentToolNames)."""

from app.agent.harness.cc_visibility import (
    is_hidden_ui_tool,
    should_emit_read_result_labels,
    should_emit_tool_progress_log,
    should_emit_tool_started,
    should_forward_worker_live_event,
    tool_display_name,
)


def test_hidden_tools():
    assert is_hidden_ui_tool("output")
    assert is_hidden_ui_tool("PlanResult")
    assert not is_hidden_ui_tool("ReadChapter")


def test_tool_started_visibility():
    assert should_emit_tool_started("WriteChapter")
    assert not should_emit_tool_started("output")


def test_read_labels_disabled():
    assert not should_emit_read_result_labels("ReadMemory", "")
    assert not should_emit_read_result_labels("ReadChapter", "")


def test_tool_progress_log_only_chapter_write():
    assert should_emit_tool_progress_log("WriteChapter")
    assert should_emit_tool_progress_log("EditChapter")
    assert not should_emit_tool_progress_log("ReadChapter")
    assert not should_emit_tool_progress_log("ListChapters")


def test_display_name_read_memory():
    name = tool_display_name("ReadMemory", {"scope": "world", "key": "rules"})
    assert name == "查阅记忆"


def test_worker_live_event_drops_step_completed():
    assert not should_forward_worker_live_event(
        {"type": "step.completed", "payload": {"display": {"content": "x" * 50000}}}
    )
    assert should_forward_worker_live_event(
        {"type": "tool.completed", "payload": {"name": "WriteMemory", "display_excerpt": "ok"}}
    )
