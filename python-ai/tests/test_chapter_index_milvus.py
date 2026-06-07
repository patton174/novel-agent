"""Milvus-backed chapter index integration (mocked)."""

from __future__ import annotations

import pytest

from app.rag import chapter_index
from app.rag.chapter_index import IndexedChunk, set_test_backend


class _FakeMilvusBackend:
    def __init__(self) -> None:
        self.upserted: list[IndexedChunk] = []
        self.searched: list[tuple[str, list[float], int]] = []

    def upsert(self, chunks: list[IndexedChunk]) -> None:
        self.upserted.extend(chunks)

    def search(
        self, novel_id: str, query_vec: list[float], *, top_k: int
    ) -> list[dict]:
        self.searched.append((novel_id, query_vec, top_k))
        return [
            {
                "chapter_id": "ch-1",
                "title": "第一章",
                "content": "神秘老人",
                "score": 0.95,
            }
        ]

    def remove_chapter(self, chapter_id: str) -> None:
        _ = chapter_id

    def list_novel_chunks(self, novel_id: str) -> list[dict]:
        _ = novel_id
        return []

    def clear_novel(self, novel_id: str) -> None:
        _ = novel_id


@pytest.mark.asyncio
async def test_search_novel_calls_backend(monkeypatch):
    fake = _FakeMilvusBackend()
    set_test_backend(fake)
    async def _fake_embed(texts):
        return [[0.1] * 384 for _ in texts]

    monkeypatch.setattr("app.rag.chapter_index.embed_texts", _fake_embed)
    hits = await chapter_index.search_novel("novel-1", "神秘老人", top_k=3, mode="vector")
    assert hits[0]["chapter_id"] == "ch-1"
    assert fake.searched[0][0] == "novel-1"
    assert fake.searched[0][2] == 3


@pytest.mark.asyncio
async def test_index_chapter_upserts_via_backend(monkeypatch):
    fake = _FakeMilvusBackend()
    set_test_backend(fake)
    async def _fake_embed(texts):
        return [[0.2] * 384 for _ in texts]

    monkeypatch.setattr("app.rag.chapter_index.embed_texts", _fake_embed)
    count = await chapter_index.index_chapter(
        novel_id="novel-1",
        chapter_id="ch-1",
        title="第一章",
        content="少年张三遇见神秘老人。",
    )
    assert count >= 1
    assert fake.upserted
    assert fake.upserted[0].novel_id == "novel-1"
