"""Memory index context — scope_root_ids and stale patch handling."""

from app.agent.backend.memory_catalog import (
    extract_scope_root_ids,
    format_memory_index,
    load_all_memory_trees,
)
from app.agent.context.memory_log import build_memory_write_batch_ack
from app.agent.context.prompting.run_context import assemble_run_context
from app.agent.schemas import AgentRunContext
from app.agent.tools.memory import _memory_mutation_patch


def test_extract_scope_root_ids():
    trees = {
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
        "角色设定": {
            "scope": "角色设定",
            "count": 1,
            "nodes": [
                {
                    "memory_id": "root-char-uuid",
                    "title": "角色设定",
                    "sort_order": 0,
                    "node_kind": "both",
                    "child_count": 0,
                    "children": [],
                }
            ],
        },
    }
    assert extract_scope_root_ids(trees) == {
        "世界观": "root-world-uuid",
        "角色设定": "root-char-uuid",
    }


def test_format_memory_index_lists_scope_root_ids():
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        user_message="hi",
        novel_id="novel-1",
    )
    trees = {
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
    }
    text = format_memory_index(ctx, trees=trees)
    assert "scope_root_ids" in text
    assert "parent_id=root-world-uuid" in text
    assert "[memory_id=root-world-uuid]" in text


def test_stale_empty_tree_patch_falls_back_to_fetch(monkeypatch):
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        user_message="hi",
        novel_id="novel-1",
        context_patch={
            "memory_tree_index": {"世界观": {}, "角色设定": {}},
        },
    )

    def fake_fetch(_ctx):
        return {
            "世界观": {
                "scope": "世界观",
                "count": 1,
                "nodes": [
                    {
                        "memory_id": "fresh-uuid",
                        "title": "世界观",
                        "sort_order": 0,
                        "node_kind": "both",
                        "child_count": 0,
                        "children": [],
                    }
                ],
            },
        }

    monkeypatch.setattr(
        "app.agent.backend.memory_catalog.fetch_all_memory_trees_sync",
        fake_fetch,
    )
    trees = load_all_memory_trees(ctx)
    assert trees["世界观"]["nodes"][0]["memory_id"] == "fresh-uuid"


def test_assemble_run_context_includes_scope_root_ids(monkeypatch):
    from app.agent.backend.memory_catalog import invalidate_memory_trees_cache

    tree_index = {
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
    }
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        user_message="hi",
        novel_id="novel-1",
        context_patch={"memory_tree_index": tree_index},
    )
    invalidate_memory_trees_cache(user_id=1, novel_id="novel-1")

    def fake_fetch(_ctx):
        return tree_index

    monkeypatch.setattr(
        "app.agent.backend.memory_catalog.fetch_all_memory_trees_sync",
        fake_fetch,
    )
    bundle = assemble_run_context(ctx)
    memory = bundle.get("memory") or {}
    assert memory.get("scope_root_ids") == {"世界观": "root-world-uuid"}
    assert "parent_id=root-world-uuid" in (memory.get("memory_index") or "")


def test_memory_mutation_patch_does_not_wipe_tree_index():
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        user_message="hi",
        novel_id="novel-1",
        context_patch={
            "memory_tree_index": {
                "世界观": {
                    "scope": "世界观",
                    "count": 1,
                    "nodes": [{"memory_id": "keep-me", "title": "世界观", "sort_order": 0}],
                },
            },
        },
    )
    patch = _memory_mutation_patch(
        ctx,
        tool="UpdateMemoryContent",
        ok=True,
        summary="ok",
        memory_id="keep-me",
        scope="世界观",
        title="世界观",
    )
    assert "memory_tree_index" not in patch
    merged = dict(ctx.context_patch or {})
    merged.update(patch)
    assert merged["memory_tree_index"]["世界观"]["nodes"][0]["memory_id"] == "keep-me"


def test_batch_ack_includes_scope_root_ids():
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        user_message="hi",
        context_patch={
            "memory_ops_log": [
                {
                    "tool": "CreateMemory",
                    "ok": True,
                    "title": "世界观",
                    "scope": "世界观",
                    "item_id": "root-world-uuid",
                },
            ],
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
    text = build_memory_write_batch_ack(ctx)
    assert text is not None
    assert "parent_id=root-world-uuid" in text
