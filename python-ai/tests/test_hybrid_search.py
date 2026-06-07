"""Hybrid search — RRF fusion and rerank flag."""

from __future__ import annotations

import pytest

from app.rag import hybrid_search


def test_rrf_fusion_prefers_dual_ranked_item():
    vec = [
        {"chunk_id": "a", "chapter_id": "c1", "title": "A", "content": "alpha", "score": 0.9},
        {"chunk_id": "b", "chapter_id": "c2", "title": "B", "content": "beta", "score": 0.8},
    ]
    bm25 = [
        {"chunk_id": "b", "chapter_id": "c2", "title": "B", "content": "beta", "score": 3.0},
        {"chunk_id": "c", "chapter_id": "c3", "title": "C", "content": "gamma", "score": 2.0},
    ]
    fused = hybrid_search.reciprocal_rank_fusion(vec, bm25)
    assert fused[0]["chunk_id"] == "b"
    assert fused[0]["rrf_score"] > fused[1]["rrf_score"]


@pytest.mark.asyncio
async def test_rerank_disabled_passthrough(monkeypatch):
    monkeypatch.setattr(hybrid_search.settings, "rag_rerank_enabled", False)
    hits = [{"chunk_id": "x", "content": "foo", "rrf_score": 0.5}]
    out = await hybrid_search.rerank("foo", hits)
    assert out == hits


@pytest.mark.asyncio
async def test_hybrid_search_merges_recalls(monkeypatch):
    async def fake_vector(novel_id, query, *, top_k=20):
        return [{"chunk_id": "v1", "chapter_id": "c1", "title": "T", "content": "向量命中", "score": 0.9}]

    def fake_bm25(novel_id, query, *, top_k=20):
        return [{"chunk_id": "b1", "chapter_id": "c2", "title": "T2", "content": "关键词命中", "score": 2.0}]

    monkeypatch.setattr(hybrid_search, "vector_recall", fake_vector)
    monkeypatch.setattr(hybrid_search, "bm25_recall", fake_bm25)
    monkeypatch.setattr(hybrid_search.settings, "rag_rerank_enabled", False)

    hits = await hybrid_search.hybrid_search("novel-1", "测试", top_k=2)
    ids = {h["chunk_id"] for h in hits}
    assert ids == {"v1", "b1"}
