"""Tests for tool batch partition (API tools)."""

from app.agent.harness.tool_orchestration import ToolExecutionItem, partition_tool_calls


def _item(tool: str) -> ToolExecutionItem:
    return ToolExecutionItem(tool_call_id=f"id_{tool}", tool=tool, input={})


def test_partition_merges_consecutive_read_only():
    items = [
        _item("ReadChapter"),
        _item("ListChapters"),
        _item("WriteChapter"),
        _item("SearchKnowledge"),
        _item("SearchKnowledge"),
    ]
    batches = partition_tool_calls(items)
    assert len(batches) == 3
    assert batches[0].concurrency_safe and len(batches[0].items) == 2
    assert not batches[1].concurrency_safe and batches[1].items[0].tool == "WriteChapter"
    assert batches[2].concurrency_safe and len(batches[2].items) == 2


def test_partition_write_tools_never_parallel_with_reads():
    items = [_item("EditChapter"), _item("ReadChapter")]
    batches = partition_tool_calls(items)
    assert len(batches) == 2
    assert not batches[0].concurrency_safe
    assert batches[1].concurrency_safe


def test_partition_agent_calls_run_serially():
    """P1.3: 子 Agent 会写章/写记忆，强制串行——每个 Agent 独占一批、非并发。"""
    agent_in = {
        "description": "优化第6章",
        "prompt": "压缩第6章到3000字以内",
    }
    items = [
        ToolExecutionItem(tool_call_id="a1", tool="Agent", input=agent_in),
        ToolExecutionItem(tool_call_id="a2", tool="Agent", input=agent_in),
        ToolExecutionItem(tool_call_id="a3", tool="Agent", input=agent_in),
    ]
    batches = partition_tool_calls(items)
    assert len(batches) == 3
    assert all(not b.concurrency_safe and len(b.items) == 1 for b in batches)


def test_partition_agent_not_batched_with_reads():
    """只读工具不得与 Agent 合批。"""
    agent_in = {"description": "x", "prompt": "y"}
    items = [
        _item("ReadChapter"),
        ToolExecutionItem(tool_call_id="a1", tool="Agent", input=agent_in),
        _item("ReadChapter"),
    ]
    batches = partition_tool_calls(items)
    assert len(batches) == 3
    assert batches[0].concurrency_safe
    assert not batches[1].concurrency_safe and batches[1].items[0].tool == "Agent"
    assert batches[2].concurrency_safe


def test_reorder_execution_puts_reads_before_writes():
    from app.agent.harness.orchestration_contract import reorder_execution_items

    items = [
        ToolExecutionItem(
            tool_call_id="w",
            tool="WriteChapter",
            input={"title": "章"},
            call_order=0,
        ),
        ToolExecutionItem(
            tool_call_id="r1",
            tool="ReadChapter",
            input={"chapter_id": "a"},
            call_order=1,
        ),
        ToolExecutionItem(
            tool_call_id="r2",
            tool="ReadMemory",
            input={"scope": "world", "key": "k"},
            call_order=2,
        ),
    ]
    reordered = reorder_execution_items(items)
    assert [i.tool for i in reordered] == [
        "ReadChapter",
        "ReadMemory",
        "WriteChapter",
    ]
    batches = partition_tool_calls(reordered)
    assert len(batches) == 2
    assert batches[0].concurrency_safe and len(batches[0].items) == 2
    assert not batches[1].concurrency_safe
