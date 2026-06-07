"""Shared pytest fixtures."""

from __future__ import annotations

import pytest

from app.rag.chapter_index import _MemoryBackend, set_test_backend


@pytest.fixture(autouse=True)
def rag_test_index_backend(monkeypatch):
    """Use in-memory chapter index + disabled embeddings in unit tests."""
    backend = _MemoryBackend()
    set_test_backend(backend)
    monkeypatch.setenv("RAG_EMBED_PROVIDER", "disabled")
    monkeypatch.setattr("app.config.settings.rag_embed_provider", "disabled")
    monkeypatch.setattr("app.config.settings.rag_embed_fail_fast", False)
    yield backend
    set_test_backend(None)
