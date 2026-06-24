"""prepare_tool_input + validated tool.use.ready gate."""

import pytest

from app.agent.harness.tool_call_chunk_accumulator import ReadyToolCall
from app.agent.harness.tool_use_ready import build_validated_tool_use_events
from app.agent.schemas import AgentRunContext
from app.agent.tools.prepare_tool_input import apply_tool_input_policy, prepare_tool_input


def _ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        novel_id="n1",
    )


def test_write_chapter_strips_inline_content():
    out = apply_tool_input_policy(
        "WriteChapter",
        {"title": "新章", "content": "不应预填" * 20},
    )
    assert out["content"] == ""


def test_read_chapter_rejects_empty_target():
    prepared, err = prepare_tool_input("ReadChapter", {}, _ctx())
    assert prepared is None
    assert err


def test_read_chapter_accepts_index():
    prepared, err = prepare_tool_input("ReadChapter", {"index": 2}, _ctx())
    assert err is None
    assert prepared is not None
    assert prepared.canonical["index"] == 2


def test_validated_ready_emits_invalid_for_bad_args():
    ready = ReadyToolCall(
        tool_call_id="c1",
        tool="ReadChapter",
        input={},
        stream_index=1,
    )
    events, _ = build_validated_tool_use_events(
        ready=ready,
        ctx=_ctx(),
        run_id="r1",
        session_id="s1",
        message_id="m1",
        step_id="plan",
        sequence=10,
    )
    assert len(events) == 1
    assert events[0]["type"] == "tool.use.invalid"


def test_validated_ready_emits_ready_for_good_args():
    ready = ReadyToolCall(
        tool_call_id="c1",
        tool="ReadChapter",
        input={"chapter_id": "2067549463093698562"},
        stream_index=1,
    )
    events, _ = build_validated_tool_use_events(
        ready=ready,
        ctx=_ctx(),
        run_id="r1",
        session_id="s1",
        message_id="m1",
        step_id="plan",
        sequence=10,
    )
    assert events[0]["type"] == "tool.use.ready"
    assert events[0]["payload"]["input"]["chapter_id"] == "2067549463093698562"


def test_update_memory_fields_rejects_only_memory_id():
    prepared, err = prepare_tool_input(
        "UpdateMemoryFields",
        {"memory_id": "2067665689536296962"},
        _ctx(),
    )
    assert prepared is None
    assert err
    assert "Provide at least one" in err


def test_update_memory_content_rejects_null_content():
    out = apply_tool_input_policy(
        "UpdateMemoryContent",
        {"memory_id": "2067665689536296962", "content": None},
    )
    assert "content" not in out
    prepared, err = prepare_tool_input("UpdateMemoryContent", out, _ctx())
    assert prepared is None
    assert err


def test_update_memory_content_accepts_body():
    prepared, err = prepare_tool_input(
        "UpdateMemoryContent",
        {"memory_id": "2067665689536296962", "content": "## 世界观\n…"},
        _ctx(),
    )
    assert err is None
    assert prepared is not None
    assert prepared.canonical["content"].startswith("## 世界观")


def test_update_memory_meta_rejects_empty_object():
    prepared, err = prepare_tool_input(
        "UpdateMemoryMeta",
        {"memory_id": "2067665689536296962", "meta": {}},
        _ctx(),
    )
    assert prepared is None
    assert err


def test_update_memory_meta_accepts_object():
    prepared, err = prepare_tool_input(
        "UpdateMemoryMeta",
        {"memory_id": "2067665689536296962", "meta": {"era": "现代"}},
        _ctx(),
    )
    assert err is None
    assert prepared is not None
    assert prepared.canonical["meta"] == {"era": "现代"}


def test_create_memory_child_rejects_scope_without_parent_id():
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        novel_id="novel-1",
        context_patch={
            "memory_tree_index": {
                "世界观": {
                    "scope": "世界观",
                    "count": 1,
                    "nodes": [
                        {
                            "memory_id": "root-world-uuid",
                            "title": "世界观",
                            "sort_order": 0,
                            "node_kind": "both",
                            "child_count": 0,
                            "children": [],
                        }
                    ],
                },
            },
        },
    )
    prepared, err = prepare_tool_input(
        "CreateMemory",
        {"node_type": "child", "scope": "世界观", "title": "时代背景", "content": "## 背景"},
        ctx,
    )
    assert prepared is None
    assert err


def test_create_memory_child_does_not_infer_scope_from_last_memory_patch():
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        novel_id="novel-1",
        context_patch={
            "last_memory_patch": {
                "ok": True,
                "memory_id": "2067684046409777154",
                "scope": "世界观",
            },
            "memory_tree_index": {
                "世界观": {
                    "scope": "世界观",
                    "count": 1,
                    "nodes": [
                        {
                            "memory_id": "root-world-uuid",
                            "title": "世界观",
                            "sort_order": 0,
                        }
                    ],
                },
            },
        },
    )
    prepared, err = prepare_tool_input(
        "CreateMemory",
        {
            "node_type": "child",
            "title": "时代背景与地理",
            "parent_id": None,
            "scope": None,
        },
        ctx,
    )
    assert prepared is None
    assert err


def test_create_memory_child_null_placeholders_stripped_without_inference():
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        novel_id="novel-1",
        context_patch={
            "last_memory_patch": {"ok": True, "scope": "世界观"},
            "memory_tree_index": {
                "世界观": {
                    "scope": "世界观",
                    "count": 1,
                    "nodes": [{"memory_id": "root-world-uuid", "title": "世界观", "sort_order": 0}],
                },
            },
        },
    )
    out = apply_tool_input_policy(
        "CreateMemory",
        {"node_type": "child", "title": "地点设定", "parent_id": None, "content": None},
        ctx,
    )
    assert "parent_id" not in out
    assert "content" not in out


def test_create_memory_child_error_lists_scope_root_ids():
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        novel_id="novel-1",
        context_patch={
            "memory_tree_index": {
                "世界观": {
                    "scope": "世界观",
                    "count": 1,
                    "nodes": [{"memory_id": "root-world-uuid", "title": "世界观", "sort_order": 0}],
                },
            },
        },
    )
    prepared, err = prepare_tool_input(
        "CreateMemory",
        {"node_type": "child", "title": "时代背景"},
        ctx,
    )
    assert prepared is None
    assert err
    assert "scope=世界观" in err
    assert "root-world-uuid" in err


def test_edit_chapter_line_content_null_rejected():
    ctx = AgentRunContext(run_id="r1", session_id="s1", message_id="m1", user_id=1, novel_id="n1")
    prepared, err = prepare_tool_input(
        "EditChapter",
        {
            "chapter_id": "ch-1",
            "line_start": 5,
            "line_content": None,
        },
        ctx,
    )
    assert prepared is None
    assert err
    assert "line_content" in err.lower()


def test_edit_chapter_line_content_null_stripped_before_validate():
    """Null optional keys are stripped; line_start without line_content must fail."""
    out = apply_tool_input_policy(
        "EditChapter",
        {"chapter_id": "ch-1", "line_start": 5, "line_content": None},
    )
    assert "line_content" not in out
    prepared, err = prepare_tool_input("EditChapter", out, _ctx())
    assert prepared is None
    assert err
