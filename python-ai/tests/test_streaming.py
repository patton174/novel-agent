"""Tests for SSE micro-chunk splitting."""

import random

from app.runtime.streaming import emit_sse_text_chunks, micro_chunk_for_sse


def test_micro_chunk_for_sse_splits_into_small_pieces():
    text = "这是一段用于测试的中文可见正文内容"
    rng = random.Random(0)
    chunks = micro_chunk_for_sse(text, rng=rng)
    assert chunks
    assert "".join(chunks) == text
    assert all(1 <= len(c) <= 32 or c == "\n" for c in chunks)
    assert all("\ufffd" not in c for c in chunks)


def test_micro_chunk_for_sse_preserves_newlines():
    text = "第一行\n第二行"
    chunks = micro_chunk_for_sse(text, rng=random.Random(1))
    assert "".join(chunks) == text
    assert "\n" in chunks


def test_emit_sse_text_chunks_strips_replacement_char():
    chunks = emit_sse_text_chunks("你好\ufffd世界")
    assert "".join(chunks) == "你好世界"
