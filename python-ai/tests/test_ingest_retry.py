"""Tests for RAG ingest retry queue."""

from __future__ import annotations

import pytest

from app.rag import ingest_queue


@pytest.mark.asyncio
async def test_retry_then_success(monkeypatch):
    calls = {"n": 0}

    async def flaky(**kw):
        calls["n"] += 1
        if calls["n"] < 3:
            raise RuntimeError("502")
        return 5

    monkeypatch.setattr(ingest_queue, "_do_index", flaky)
    out = await ingest_queue.index_with_retry(
        max_attempts=3,
        novel_id="n",
        chapter_id="c",
        title="t",
        content="x",
    )
    assert out == 5
    assert calls["n"] == 3


@pytest.mark.asyncio
async def test_retry_exhausted_raises(monkeypatch):
    async def always_fail(**kw):
        raise RuntimeError("502")

    monkeypatch.setattr(ingest_queue, "_do_index", always_fail)
    with pytest.raises(RuntimeError, match="502"):
        await ingest_queue.index_with_retry(
            max_attempts=2,
            novel_id="n",
            chapter_id="c",
            title="t",
            content="x",
        )
