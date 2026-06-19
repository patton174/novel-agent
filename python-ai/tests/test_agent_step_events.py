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


def test_read_memory_ok_when_content_contains_failure_word():
    result = StepResult(
        step_kind="ReadMemory",
        action="continue",
        next_tool="",
        next_input={},
        context_patch={},
        display=DisplayPayload(
            type="tool",
            tool="ReadMemory",
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


def test_read_memory_error_envelope():
    payload = build_tool_completed_sse_payload(
        "ReadMemory",
        content='<tool_use_error code="MEMORY_ITEM_NOT_FOUND">not found</tool_use_error>',
        failed=True,
        tool_input={"memory_id": "missing"},
    )
    assert payload["status"] == "error"


def test_read_chapter_emits_title_labels_not_md_path():
    content = (
        "---\ntitle: 初入江湖\nchapter_id: abc\nlist_index: 2\nsort_order: 1\n---\n\n正文"
    )
    payload = build_tool_completed_sse_payload(
        "ReadChapter",
        content=content,
        tool_input={"chapter_id": "abc"},
    )
    assert payload["result_labels"] == ["《初入江湖》·作品列表第2章"]
    assert "display_excerpt" in payload
    assert "初入江湖" in payload["display_excerpt"]
    assert "chapter_id" not in payload["display_excerpt"]


def test_list_chapters_sse_uses_display_excerpt():
    content = '{"chapters": [{"chapter_id": "ch_0", "title": "第一章"}]}'
    payload = build_tool_completed_sse_payload(
        "ListChapters",
        content=content,
        tool_input={},
    )
    assert "display_excerpt" in payload
    assert "第一章" in payload["display_excerpt"]
    assert "output_summary" in payload
    assert "第一章" in payload["output_summary"]


def test_write_completed_payload_omits_body_from_tool_input():
    body = "　　" + ("正文" * 2000)
    payload = build_tool_completed_sse_payload(
        "WriteChapter",
        content="已写入",
        tool_input={"title": "第一章", "chapter_id": "ch-1", "content": body},
    )
    assert payload["tool_input"]["title"] == "第一章"
    assert "content" not in payload["tool_input"]


def test_create_memory_completed_payload_omits_large_meta():
    from app.agent.harness.events import _tool_input_for_sse

    meta = {"sections": [{"title": "设定", "body": "x" * 8000}]}
    slim = _tool_input_for_sse(
        "CreateMemory",
        {"scope": "world", "title": "设定", "meta": meta},
    )
    assert slim["scope"] == "world"
    assert slim["title"] == "设定"
    assert "meta" not in slim

    payload = build_tool_completed_sse_payload(
        "CreateMemory",
        content='{"memory_id": "m1"}',
        tool_input={"scope": "world", "title": "设定", "meta": meta},
    )
    assert payload["tool_input"]["scope"] == "world"
    assert "meta" not in payload["tool_input"]


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
