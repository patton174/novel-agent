"""Tests for independent RAG embedding provider."""

from __future__ import annotations

import pytest

from app.rag import embeddings
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
    monkeypatch.setattr("app.config.settings.openai_api_key", "")
    monkeypatch.setattr("app.config.settings.rag_embed_base_url", "")
    monkeypatch.setattr("app.config.settings.openai_base_url", None)
    monkeypatch.setattr("app.config.settings.rag_embed_fail_fast", True)
    with pytest.raises(RuntimeError, match="embedding"):
        await embed_texts(["test"])


@pytest.mark.asyncio
async def test_openai_routes_to_provider(monkeypatch):
    monkeypatch.setattr("app.config.settings.rag_embed_provider", "openai")
    monkeypatch.setattr("app.config.settings.rag_embed_api_key", "sk-test")
    monkeypatch.setattr("app.config.settings.rag_embed_base_url", "")
    monkeypatch.setattr("app.config.settings.openai_base_url", None)
    monkeypatch.setattr("app.config.settings.rag_embed_fail_fast", True)

    class _FakeEmb:
        async def aembed_documents(self, texts):
            return [[0.1, 0.2, 0.3] for _ in texts]

    monkeypatch.setattr("langchain_openai.OpenAIEmbeddings", lambda **_: _FakeEmb())
    vecs = await embed_texts(["a", "b"])
    assert vecs == [[0.1, 0.2, 0.3], [0.1, 0.2, 0.3]]


@pytest.mark.asyncio
async def test_minimax_base_url_uses_native_embedding_shape(monkeypatch):
    monkeypatch.setattr("app.config.settings.rag_embed_provider", "openai")
    monkeypatch.setattr("app.config.settings.rag_embed_api_key", "sk-test")
    monkeypatch.setattr("app.config.settings.rag_embed_base_url", "https://api.minimaxi.com/v1")
    monkeypatch.setattr("app.config.settings.rag_embed_model", "text-embedding-3-small")
    monkeypatch.setattr("app.config.settings.rag_embed_fail_fast", True)

    sent: dict[str, object] = {}

    class _FakeResponse:
        status_code = 200

        def raise_for_status(self):
            return None

        def json(self):
            return {
                "vectors": [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
                "base_resp": {"status_code": 0, "status_msg": "success"},
            }

    class _FakeClient:
        def __init__(self, **kwargs):
            sent["client_kwargs"] = kwargs

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def post(self, url, *, headers, json):
            sent["url"] = url
            sent["headers"] = headers
            sent["json"] = json
            return _FakeResponse()

    monkeypatch.setattr("httpx.AsyncClient", _FakeClient)
    monkeypatch.setattr(
        "langchain_openai.OpenAIEmbeddings",
        lambda **_: (_ for _ in ()).throw(AssertionError("OpenAI wrapper should not be used")),
    )

    vecs = await embeddings.embed_texts(["a", "b"])

    assert vecs == [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
    assert sent["url"] == "https://api.minimaxi.com/v1/embeddings"
    assert sent["json"] == {"model": "embo-01", "type": "db", "texts": ["a", "b"]}
