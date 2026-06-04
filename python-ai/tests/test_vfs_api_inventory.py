"""VFS Glob/Grep/Read inventory must come from HTTP APIs, not disk."""

from __future__ import annotations

import pytest

from app.agent_step.schemas import AgentRunContext
from app.agent_step.tools.cc import vfs_ops
from app.agent_step.vfs.api_inventory import VFS_API_SOURCE_HEADER
from app.agent_step.vfs.memory_catalog import list_memory_vfs_paths, memory_path_segment


@pytest.mark.asyncio
async def test_vfs_glob_includes_api_header(monkeypatch):
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        novel_id="novel-1",
        mode="write",
        user_message="x",
        chapters=[{"id": "c1", "title": "第一章", "sort_order": 1, "word_count": 100}],
    )

    async def fake_summaries(_ctx):
        return ctx.chapters

    monkeypatch.setattr(
        vfs_ops.chapter_store, "fetch_chapter_summaries", fake_summaries
    )
    monkeypatch.setattr(
        vfs_ops,
        "list_memory_vfs_paths",
        lambda _ctx: ["/novel/novel-1/memory/world/rules.json"],
    )

    out = await vfs_ops.vfs_glob(ctx, "*", None)
    assert VFS_API_SOURCE_HEADER in out
    assert "Content API" in out
    assert "/novel/novel-1/chapters/index.json" in out
    assert "/novel/novel-1/chapters/c1.md" in out
    assert "memory/world/rules.json" in out
    assert "禁止" in out or "catalog" in out


def test_memory_path_segment_roundtrip():
    name = "苏夜"
    seg = memory_path_segment(name)
    assert seg != name
    from app.agent_step.vfs.memory_catalog import memory_path_segment_decode

    assert memory_path_segment_decode(seg) == name


def test_list_memory_paths_empty_without_novel():
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        mode="write",
        user_message="x",
    )
    assert list_memory_vfs_paths(ctx) == []
