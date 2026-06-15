"""Tests for display -> SSE event mapping."""

from app.agent.harness.events import build_tool_completed_sse_payload, emit_display_events
from app.agent.schemas import DisplayPayload, StepResult


def test_emit_think_display_events():
    result = StepResult(
        step_kind="think",
        action="continue",
        next_tool="output",
        next_input={},
        context_patch={},
        display=DisplayPayload(
            type="think",
            title="分析请求",
            content="## 任务理解\n续写",
            stream=False,
        ),
        reason="ok",
    )
    events, seq = emit_display_events(
        result,
        run_id="run_1",
        session_id="session_1",
        message_id="msg_1",
        think_step_id="think_1",
        message_step_id="msg_step_1",
        sequence=0,
    )
    types = [e["type"] for e in events]
    assert types == ["think.started", "think.delta", "think.completed"]
    assert events[1]["payload"]["text"] == "## 任务理解\n续写"
    assert seq == 3


def test_memory_read_ok_when_world_content_contains_failure_word():
    result = StepResult(
        step_kind="memory_read",
        action="continue",
        next_tool="",
        next_input={},
        context_patch={},
        display=DisplayPayload(
            type="tool",
            tool="memory_read",
            content="世界观记忆：\n- 禁区：登录失败率 30%，爆率分层已设定",
        ),
        reason="memory read",
    )
    events, _ = emit_display_events(
        result,
        run_id="run_1",
        session_id="session_1",
        message_id="msg_1",
        think_step_id="think_1",
        message_step_id="msg_step_1",
        sequence=0,
    )
    completed = next(e for e in events if e["type"] == "tool.completed")
    assert completed["payload"]["status"] == "ok"


def test_memory_read_error_when_key_missing():
    result = StepResult(
        step_kind="memory_read",
        action="continue",
        next_tool="",
        next_input={},
        context_patch={},
        display=DisplayPayload(
            type="tool",
            tool="memory_read",
            content="key not found: 守序者一族",
        ),
        reason="memory read",
    )
    events, _ = emit_display_events(
        result,
        run_id="run_1",
        session_id="session_1",
        message_id="msg_1",
        think_step_id="think_1",
        message_step_id="msg_step_1",
        sequence=0,
    )
    completed = next(e for e in events if e["type"] == "tool.completed")
    assert completed["payload"]["status"] == "error"


def test_read_chapter_emits_title_labels_not_md_path():
    content = (
        "---\ntitle: 初入江湖\nchapter_id: abc\nlist_index: 2\nsort_order: 1\n---\n\n正文"
    )
    path = "/novel/n1/chapters/abc.md"
    payload = build_tool_completed_sse_payload(
        "ReadChapter",
        content=content,
        tool_input={"chapter_id": "abc", "file_path": path},
    )
    assert payload["result_labels"] == ["《初入江湖》·作品列表第2章"]
    assert "display_excerpt" in payload
    assert "初入江湖" in payload["display_excerpt"]
    assert "chapter_id" not in payload["display_excerpt"]


def test_glob_long_output_passes_inventory_body_for_frontend_ui():
    content = '{"chapters": [{"chapter_id": "ch_0", "title": "第一章"}]}'
    payload = build_tool_completed_sse_payload(
        "ListChapters",
        content=content,
        tool_input={},
    )
    assert "display_excerpt" in payload
    assert "第一章" in payload["display_excerpt"]
    assert "output" in payload
    assert "ch_0" in payload["output"] or "第一章" in payload["output"]
    assert "output_summary" in payload
    assert "第一章" in payload["output_summary"] or "ch_0" in payload["output_summary"]


def test_write_completed_payload_omits_body_from_tool_input():
    body = "　　" + ("正文" * 2000)
    payload = build_tool_completed_sse_payload(
        "WriteChapter",
        content="已写入",
        tool_input={"title": "第一章", "chapter_id": "ch-1", "content": body},
    )
    assert payload["tool_input"]["title"] == "第一章"
    assert "content" not in payload["tool_input"]


def test_write_memory_completed_payload_omits_document_from_tool_input():
    from app.agent.harness.events import _tool_input_for_sse

    doc = {"sections": [{"title": "设定", "body": "x" * 8000}]}
    slim = _tool_input_for_sse(
        "WriteMemory",
        {"scope": "novel", "key": "world", "payload": doc},
    )
    assert slim["scope"] == "novel"
    assert slim["key"] == "world"
    assert "payload" not in slim

    payload = build_tool_completed_sse_payload(
        "WriteMemory",
        content='{"ok": true}',
        tool_input={"scope": "novel", "key": "world", "payload": doc},
    )
    assert payload["tool_input"]["scope"] == "novel"
    assert "payload" not in payload["tool_input"]


def test_todo_write_completed_payload_includes_todos():
    todos = [
        {"id": "a", "content": "写第一章", "status": "in_progress"},
        {"id": "b", "content": "校对", "status": "pending"},
    ]
    payload = build_tool_completed_sse_payload(
        "TodoWrite",
        content="Todos updated.",
        context_patch={"todos": todos},
    )
    assert payload["todos"] == todos
