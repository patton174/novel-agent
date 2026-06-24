"""Tests for display -> SSE event mapping."""

import json

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


def test_read_chapter_emits_title_only():
    content = (
        "---\ntitle: 初入江湖\nchapter_id: abc\nlist_index: 2\nsort_order: 1\n---\n\n正文"
    )
    payload = build_tool_completed_sse_payload(
        "ReadChapter",
        content=content,
        tool_input={"chapter_id": "abc"},
    )
    assert "result_labels" not in payload
    assert payload.get("display_excerpt") == "《初入江湖》"
    assert payload.get("output_summary") == "《初入江湖》"


def test_read_chapter_sse_uses_catalog_title_without_frontmatter():
    content = "     1| 第一段\n     2| 第二段"
    payload = build_tool_completed_sse_payload(
        "ReadChapter",
        content=content,
        tool_input={"index": 1},
        context_patch={
            "chapters": [
                {
                    "chapter_id": "ch-1",
                    "id": "ch-1",
                    "title": "码农的平凡日常",
                    "list_index": 1,
                }
            ]
        },
    )
    assert payload.get("display_excerpt") == "《码农的平凡日常》"


def test_read_chapter_sse_uses_read_target_from_context_patch():
    content = "     1| 正文"
    payload = build_tool_completed_sse_payload(
        "ReadChapter",
        content=content,
        tool_input={"chapter_id": "ch-1"},
        context_patch={
            "read_target": {
                "chapter_id": "ch-1",
                "title": "码农的平凡日常",
                "index": 1,
            }
        },
    )
    assert payload.get("display_excerpt") == "《码农的平凡日常》"
    assert payload.get("tool_input", {}).get("title") == "码农的平凡日常"


def test_list_chapters_sse_title_count_only():
    content = '{"count": 1, "chapters": [{"chapter_id": "ch_0", "title": "第一章"}]}'
    payload = build_tool_completed_sse_payload(
        "ListChapters",
        content=content,
        tool_input={},
    )
    assert payload.get("display_excerpt") == "1 章"
    assert payload.get("output_summary") == "1 章"


def test_edit_chapter_sse_line_edit_title_not_raw_json():
    content = json.dumps(
        {"ok": True, "chapter_id": "2067855154601754626", "index": 1},
        ensure_ascii=False,
    )
    payload = build_tool_completed_sse_payload(
        "EditChapter",
        content=content,
        tool_input={"chapter_id": "2067855154601754626", "line_start": 5},
        context_patch={
            "chapters": [
                {
                    "chapter_id": "2067855154601754626",
                    "title": "码农的平凡日常",
                    "list_index": 1,
                }
            ]
        },
    )
    assert payload.get("display_excerpt") == "《码农的平凡日常》 · 第5行"
    assert payload.get("output_summary") == "《码农的平凡日常》 · 第5行"
    assert not str(payload.get("display_excerpt") or "").startswith("{")


def test_write_chapter_sse_title_not_raw_json():
    content = json.dumps(
        {"ok": True, "chapter_id": "ch-1", "index": 1, "title": "码农的平凡日常"},
        ensure_ascii=False,
    )
    payload = build_tool_completed_sse_payload(
        "WriteChapter",
        content=content,
        tool_input={"chapter_id": "ch-1", "title": "码农的平凡日常"},
    )
    assert payload.get("display_excerpt") == "《码农的平凡日常》"
    assert not str(payload.get("display_excerpt") or "").startswith("{")


def test_delete_chapter_sse_title_not_raw_json():
    content = json.dumps({"ok": True, "deleted": ["ch-1"]}, ensure_ascii=False)
    payload = build_tool_completed_sse_payload(
        "DeleteChapter",
        content=content,
        tool_input={"chapter_id": "ch-1"},
        context_patch={
            "chapters": [
                {"chapter_id": "ch-1", "title": "码农的平凡日常", "list_index": 1},
            ]
        },
    )
    assert payload.get("display_excerpt") == "《码农的平凡日常》"


def test_reorder_chapters_sse_count_not_raw_json():
    content = json.dumps({"ok": True, "count": 2, "order": []}, ensure_ascii=False)
    payload = build_tool_completed_sse_payload("ReorderChapters", content=content)
    assert payload.get("display_excerpt") == "2 章"


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
