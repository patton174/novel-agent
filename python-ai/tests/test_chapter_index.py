"""Tests for chapter RAG index."""

import pytest

from app.rag.chapter_index import (
    clear_novel_index,
    index_chapter,
    reindex_novel,
    remove_chapter,
    search_novel,
)


@pytest.mark.asyncio
async def test_index_and_search():
    await index_chapter(
        novel_id="novel-1",
        chapter_id="ch-1",
        title="第一章",
        content="少年张三在村头遇见神秘老人，获得上古传承。",
        summary="开篇",
    )
    hits = await search_novel("novel-1", "神秘老人", top_k=3)
    assert hits
    assert hits[0]["chapter_id"] == "ch-1"
    await remove_chapter("ch-1")
    hits_after = await search_novel("novel-1", "神秘老人", top_k=3)
    assert not hits_after


@pytest.mark.asyncio
async def test_reindex_novel():
    await index_chapter(
        novel_id="novel-2",
        chapter_id="ch-old",
        title="旧章",
        content="将被覆盖的旧内容",
    )
    stats = await reindex_novel(
        "novel-2",
        [
            {
                "chapter_id": "ch-new",
                "title": "新章",
                "content": "重建索引后的全新段落，包含关键词：龙脉。",
                "summary": "重建",
            }
        ],
    )
    assert stats["indexed"] == 1
    assert stats["chapters"] == 1
    hits = await search_novel("novel-2", "龙脉", top_k=3)
    assert hits
    assert hits[0]["chapter_id"] == "ch-new"
    assert all(hit["chapter_id"] != "ch-old" for hit in hits)


@pytest.mark.asyncio
async def test_clear_novel_index():
    await index_chapter(
        novel_id="novel-3",
        chapter_id="ch-a",
        title="A",
        content="alpha content",
    )
    await clear_novel_index("novel-3")
    hits = await search_novel("novel-3", "alpha", top_k=3)
    assert not hits
