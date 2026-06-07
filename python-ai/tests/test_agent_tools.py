"""Tests for domain API tools (Phase 1)."""

from __future__ import annotations

import asyncio
import json

import pytest
from pydantic import ValidationError

from app.agent.metrics import record_tool_result, reset, snapshot
from app.agent.schemas import AgentRunContext
from app.agent.tools import chapter
from app.agent.tools.registry import build_agent_tools, find_tool_by_name, get_tool_names
from app.agent.tools.schemas import (
    MemoryScope,
    ReadChapterInput,
    SearchKnowledgeInput,
    WriteChapterInput,
    WriteMemoryInput,
)


def _ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        novel_id="novel-1",
        project={"id": "novel-1", "title": "Test"},
        chapters=[{"id": "c1", "title": "第一章", "sort_order": 1, "word_count": 10}],
    )


def test_registry_has_api_tools():
    names = get_tool_names()
    for t in (
        "ListChapters",
        "ReadChapter",
        "WriteChapter",
        "ListMemory",
        "ReadMemory",
        "SearchKnowledge",
        "AskUser",
        "Agent",
    ):
        assert t in names
    for legacy in ("Read", "Write", "Glob", "Grep", "ToolSearch", "Brief", "chapter_read"):
        assert find_tool_by_name(legacy) is None


def test_legacy_tools_removed_from_build():
    assert len(build_agent_tools()) >= 14


def test_read_chapter_requires_id():
    with pytest.raises(ValidationError):
        ReadChapterInput()


def test_memory_scope_enum():
    with pytest.raises(ValidationError):
        WriteMemoryInput(scope="bogus", key="k", payload={})
    ok = WriteMemoryInput(scope=MemoryScope.character, key="林动", payload={"v": 1})
    assert ok.scope == MemoryScope.character


def test_list_chapters_returns_ids(monkeypatch):
    async def fake(ctx):
        return [
            {
                "id": "c1",
                "title": "第一章",
                "summary": "s",
                "sort_order": 1,
                "word_count": 10,
                "volume_id": "",
                "volume_title": "",
            }
        ]

    monkeypatch.setattr(chapter.chapter_client, "fetch_chapter_summaries", fake)
    from app.agent.tools.schemas import ListChaptersInput

    out = asyncio.run(chapter.list_chapters(_ctx(), ListChaptersInput()))
    data = json.loads(out.content)
    assert data["chapters"][0]["chapter_id"] == "c1"
    assert not out.is_error


def test_read_chapter_error(monkeypatch):
    async def fake(ctx, cid, *, offset=None, limit=None):
        return None, "chapter not found"

    monkeypatch.setattr(chapter.chapter_client, "fetch_chapter_read_slice", fake)
    out = asyncio.run(chapter.read_chapter(_ctx(), ReadChapterInput(chapter_id="x")))
    assert out.is_error


def test_write_chapter_stream_when_empty_content():

    out = asyncio.run(
        chapter.write_chapter(_ctx(), WriteChapterInput(title="新章", content=""))
    )
    assert not out.is_error
    assert out.context_patch.get("stream_chapter") is True


def test_metrics_record():
    reset()
    record_tool_result("ReadChapter", True)
    record_tool_result("ReadChapter", False)
    snap = snapshot()
    assert snap["ReadChapter"]["ok"] == 1
    assert snap["ReadChapter"]["error"] == 1


def test_search_knowledge_missing_novel():
    from app.agent.tools import knowledge

    ctx = _ctx().model_copy(update={"novel_id": "", "project": {}})
    out = asyncio.run(
        knowledge.search_knowledge(ctx, SearchKnowledgeInput(query="test"))
    )
    assert out.is_error
