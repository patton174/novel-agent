"""Tests for tool batch partition (CC tools)."""

from app.agent_step.tool_orchestration import ToolExecutionItem, partition_tool_calls


def _item(tool: str) -> ToolExecutionItem:
    return ToolExecutionItem(tool_call_id=f"id_{tool}", tool=tool, input={})


def test_partition_merges_consecutive_read_only():
    items = [
        _item("Read"),
        _item("Glob"),
        _item("Write"),
        _item("Grep"),
        _item("Grep"),
    ]
    batches = partition_tool_calls(items)
    assert len(batches) == 3
    assert batches[0].concurrency_safe and len(batches[0].items) == 2
    assert not batches[1].concurrency_safe and batches[1].items[0].tool == "Write"
    assert batches[2].concurrency_safe and len(batches[2].items) == 2


def test_partition_write_tools_never_parallel_with_reads():
    items = [_item("Edit"), _item("Read")]
    batches = partition_tool_calls(items)
    assert len(batches) == 2
    assert not batches[0].concurrency_safe
    assert batches[1].concurrency_safe


def test_partition_merges_consecutive_agent_calls():
    agent_in = {
        "description": "优化第6章",
        "prompt": "压缩第6章到3000字以内",
    }
    items = [
        ToolExecutionItem(tool_call_id="a1", tool="Agent", input=agent_in),
        ToolExecutionItem(tool_call_id="a2", tool="Agent", input=agent_in),
        ToolExecutionItem(tool_call_id="a3", tool="Agent", input=agent_in),
        ToolExecutionItem(tool_call_id="a4", tool="Agent", input=agent_in),
    ]
    batches = partition_tool_calls(items)
    assert len(batches) == 1
    assert batches[0].concurrency_safe
    assert len(batches[0].items) == 4
