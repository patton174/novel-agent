"""Agent tool batch parallelism."""

from app.agent.harness.orchestration_contract import (
    is_tool_concurrency_safe,
    reorder_execution_items,
)
from app.agent.harness.tool_orchestration import ToolExecutionItem


def test_agent_tool_parallel_by_default():
    assert is_tool_concurrency_safe("Agent", {"description": "a", "prompt": "x"}) is True


def test_reorder_puts_parallel_agents_first():
    items = [
        ToolExecutionItem(tool_call_id="1", tool="WriteChapter", input={}, call_order=0),
        ToolExecutionItem(tool_call_id="2", tool="Agent", input={}, call_order=1),
        ToolExecutionItem(tool_call_id="3", tool="Agent", input={}, call_order=2),
    ]
    reordered = reorder_execution_items(items)
    assert [i.tool for i in reordered[:2]] == ["Agent", "Agent"]
    assert reordered[-1].tool == "WriteChapter"
