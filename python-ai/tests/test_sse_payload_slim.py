"""SSE payload slimming helpers."""

from app.agent.harness.events import _tool_completed_payload, extract_memory_read_labels
from app.agent.schemas import DisplayPayload


def test_extract_memory_read_labels_from_roster():
    text = "角色库共 3 人：张三, 李四, 王五\n- 张三: 主角\n- 李四: 配角"
    assert extract_memory_read_labels(text) == ["张三", "李四", "王五"]


def test_tool_completed_memory_read_omits_full_output():
    content = "角色库共 3 人：张三, 李四, 王五\n- 张三: 主角"
    payload = _tool_completed_payload(
        name="ReadMemory",
        display_name="读取角色库",
        content=content,
        failed=False,
        display=DisplayPayload(type="tool", tool="ReadMemory", content=content),
    )
    assert "output" not in payload
    assert payload["result_labels"] == ["张三", "李四", "王五"]
    assert payload["output_summary"]


def test_tool_completed_memory_update_uses_action_label():
    content = "已更新世界观 · 核心机制"
    payload = _tool_completed_payload(
        name="UpdateMemoryContent",
        display_name="更新记忆正文",
        content=content,
        failed=False,
        display=DisplayPayload(type="tool", tool="UpdateMemoryContent", content=content),
    )
    assert payload["action_label"] == "已更新记忆正文"
    assert "output" not in payload


def test_tool_completed_failed_keeps_output():
    content = "记忆更新失败：HTTP 500"
    payload = _tool_completed_payload(
        name="UpdateMemoryContent",
        display_name="更新记忆正文",
        content=content,
        failed=True,
        display=DisplayPayload(type="tool", tool="UpdateMemoryContent", content=content),
    )
    assert payload["output"] == content
    assert payload["status"] == "error"
