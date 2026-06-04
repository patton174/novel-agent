"""Tests for display -> SSE event mapping."""

from app.agent_step.events import build_tool_completed_sse_payload, emit_display_events
from app.agent_step.schemas import DisplayPayload, StepResult


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
        "Read",
        content=content,
        tool_input={"file_path": path},
    )
    assert payload["result_labels"] == ["《初入江湖》·作品列表第2章"]
    assert "display_excerpt" in payload
    assert "初入江湖" in payload["display_excerpt"]
    assert "chapter_id" not in payload["display_excerpt"]


def test_glob_long_output_passes_inventory_body_for_frontend_ui():
    from app.agent_step.vfs.path_tree import format_paths_as_tree

    paths = [f"/novel/n1/chapters/ch_{i}.md" for i in range(5)]
    content = (
        "# 数据来源：作品库 HTTP API\n"
        "# 章节（Content API）: 5 条\n"
        + "\n".join(format_paths_as_tree(paths))
    )
    payload = build_tool_completed_sse_payload(
        "Glob",
        content=content,
        tool_input={"pattern": "chapters/**/*.md"},
    )
    assert "tool_input" in payload
    assert payload["tool_input"]["pattern"] == "chapters/**/*.md"
    assert "display_excerpt" in payload
    assert "列举" in payload["display_excerpt"]
    assert "output" in payload
    assert "├──" in payload["output"]
    assert "ch_0" in payload["output"]
    assert "output_summary" in payload
    assert "条" in payload["output_summary"]


def test_write_completed_payload_omits_body_from_tool_input():
    path = "/novel/n1/chapters/ch-1.md"
    body = "　　" + ("正文" * 2000)
    payload = build_tool_completed_sse_payload(
        "Write",
        content="已写入",
        tool_input={"file_path": path, "content": body},
    )
    assert payload["tool_input"]["file_path"] == path
    assert "content" not in payload["tool_input"]


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
