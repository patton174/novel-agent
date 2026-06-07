"""Catalog vs user novel_id namespace isolation in chapter index."""

from __future__ import annotations

import pytest

from app.rag import chapter_index
from app.rag.chapter_index import set_test_backend, _MemoryBackend


@pytest.mark.asyncio
async def test_catalog_and_user_novel_ids_are_isolated(monkeypatch):
    backend = _MemoryBackend()
    set_test_backend(backend)

    async def _fake_embed(texts):
        # deterministic distinct vectors per text prefix
        out = []
        for t in texts:
            seed = sum(ord(c) for c in t[:8]) % 1000
            vec = [0.0] * 384
            vec[seed % 384] = 1.0
            out.append(vec)
        return out

    monkeypatch.setattr(chapter_index, "embed_texts", _fake_embed)

    await chapter_index.index_chapter(
        novel_id="catalog:cn1",
        chapter_id="cat-ch-1",
        title="爬取第一章",
        content="公共书库专属段落：龙脉觉醒。",
    )
    await chapter_index.index_chapter(
        novel_id="novel-1",
        chapter_id="user-ch-1",
        title="用户第一章",
        content="用户作品专属段落：林动入门。",
    )

    cat_hits = await chapter_index.search_novel("catalog:cn1", "龙脉", top_k=3)
    user_hits = await chapter_index.search_novel("novel-1", "林动", top_k=3)

    assert cat_hits
    assert user_hits
    assert cat_hits[0]["chapter_id"] == "cat-ch-1"
    assert user_hits[0]["chapter_id"] == "user-ch-1"
    assert all(h["chapter_id"] != "user-ch-1" for h in cat_hits)
    assert all(h["chapter_id"] != "cat-ch-1" for h in user_hits)
