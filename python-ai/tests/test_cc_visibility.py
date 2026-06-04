"""CC tool visibility (aligned with frontend agentToolNames)."""

from app.agent_step.cc_visibility import (
    is_hidden_ui_tool,
    should_emit_tool_started,
    should_emit_read_result_labels,
    tool_display_name,
)


def test_hidden_tools():
    assert is_hidden_ui_tool("output")
    assert is_hidden_ui_tool("PlanResult")
    assert not is_hidden_ui_tool("Read")


def test_tool_started_visibility():
    assert should_emit_tool_started("Write")
    assert not should_emit_tool_started("output")


def test_read_labels_on_memory_path():
    assert should_emit_read_result_labels(
        "Read", "/novel/n1/memory/character/alice.json"
    )
    assert should_emit_read_result_labels(
        "Read", "/novel/n1/chapters/c1.md"
    )


def test_display_name_memory_read_path():
    name = tool_display_name(
        "Read", {"file_path": "/novel/1/memory/world/rules.json"}
    )
    assert "记忆" in name
