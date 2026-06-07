"""Semantic-ish text chunking with overlap for RAG indexing."""

from __future__ import annotations

import re

_DEFAULT_CHUNK = 480
_DEFAULT_OVERLAP = 80
_SENTENCE_END = re.compile(r"(?<=[。！？!?；;])\s*")


def chunk_text(
    text: str,
    *,
    chunk_size: int = _DEFAULT_CHUNK,
    overlap: int = _DEFAULT_OVERLAP,
) -> list[str]:
    """Split body into overlapping chunks, preferring sentence boundaries."""
    body = (text or "").strip()
    if not body:
        return []
    if len(body) <= chunk_size:
        return [body]

    sentences = [s.strip() for s in _SENTENCE_END.split(body) if s.strip()]
    if not sentences:
        sentences = [body]

    chunks: list[str] = []
    buf = ""
    for sent in sentences:
        candidate = f"{buf}{sent}" if not buf else f"{buf}{sent}"
        if len(candidate) <= chunk_size:
            buf = candidate
            continue
        if buf:
            chunks.append(buf)
            tail = buf[-overlap:] if overlap > 0 and len(buf) > overlap else ""
            buf = f"{tail}{sent}" if tail else sent
        else:
            # single sentence longer than chunk_size — hard split
            for i in range(0, len(sent), chunk_size - overlap):
                piece = sent[i : i + chunk_size]
                if piece:
                    chunks.append(piece)
            buf = ""
    if buf:
        chunks.append(buf)
    return chunks
