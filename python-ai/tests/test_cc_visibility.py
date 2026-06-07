"""Tool visibility (aligned with frontend agentToolNames)."""

from app.agent.harness.cc_visibility import (
    is_hidden_ui_tool,
    should_emit_read_result_labels,
    should_emit_tool_started,
    tool_display_name,
)


def test_hidden_tools():
    assert is_hidden_ui_tool("output")
    assert is_hidden_ui_tool("PlanResult")
    assert not is_hidden_ui_tool("ReadChapter")


def test_tool_started_visibility():
    assert should_emit_tool_started("WriteChapter")
    assert not should_emit_tool_started("output")


def test_read_labels_on_memory_path():
    assert should_emit_read_result_labels("ReadMemory", "")
    assert should_emit_read_result_labels("ReadChapter", "")


def test_display_name_read_memory():
    name = tool_display_name("ReadMemory", {"scope": "world", "key": "rules"})
    assert name == "查阅记忆"
