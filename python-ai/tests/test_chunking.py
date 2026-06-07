"""Tests for RAG chunking."""

from app.rag.chunking import chunk_text


def test_chunk_text_empty():
    assert chunk_text("") == []


def test_short_text_single_chunk():
    assert chunk_text("短文本。") == ["短文本。"]


def test_chunk_text_overlap_preserves_context():
    body = "。".join(f"第{i}句内容较长用于测试分块" for i in range(1, 30))
    chunks = chunk_text(body, chunk_size=120, overlap=20)
    assert len(chunks) >= 2
    # adjacent chunks should share some characters from overlap
    assert chunks[0][-10:] in chunks[1] or chunks[1].startswith(chunks[0][-5:])
