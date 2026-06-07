"""Tests for independent RAG embedding provider."""

from __future__ import annotations

import pytest

from app.rag.embeddings import embed_texts


@pytest.mark.asyncio
async def test_disabled_provider_uses_deterministic_vectors(monkeypatch):
    monkeypatch.setattr("app.config.settings.rag_embed_provider", "disabled")
    vecs = await embed_texts(["hello", "world"])
    assert len(vecs) == 2
    assert len(vecs[0]) == 384
    assert vecs[0] != vecs[1]


@pytest.mark.asyncio
async def test_openai_fail_fast_raises(monkeypatch):
    monkeypatch.setattr("app.config.settings.rag_embed_provider", "openai")
    monkeypatch.setattr("app.config.settings.rag_embed_api_key", "")
    monkeypatch.setattr("app.config.settings.rag_embed_fail_fast", True)
    with pytest.raises(RuntimeError, match="embedding"):
        await embed_texts(["test"])


@pytest.mark.asyncio
async def test_openai_routes_to_provider(monkeypatch):
    monkeypatch.setattr("app.config.settings.rag_embed_provider", "openai")
    monkeypatch.setattr("app.config.settings.rag_embed_api_key", "sk-test")
    monkeypatch.setattr("app.config.settings.rag_embed_fail_fast", True)

    class _FakeEmb:
        async def aembed_documents(self, texts):
            return [[0.1, 0.2, 0.3] for _ in texts]

    monkeypatch.setattr("langchain_openai.OpenAIEmbeddings", lambda **_: _FakeEmb())
    vecs = await embed_texts(["a", "b"])
    assert vecs == [[0.1, 0.2, 0.3], [0.1, 0.2, 0.3]]
