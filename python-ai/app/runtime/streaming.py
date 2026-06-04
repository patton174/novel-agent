"""SSE streaming helpers."""

from __future__ import annotations

import random


def _grapheme_clusters(text: str) -> list[str]:
    """User-perceived characters (Unicode code points; safe for CJK)."""
    return list(text)


def micro_chunk_for_sse(
    text: str,
    *,
    min_size: int = 16,
    max_size: int = 32,
    rng: random.Random | None = None,
) -> list[str]:
    """Split visible text into 16–32 character SSE chunks without breaking newlines."""
    cleaned = (text or "").replace("\ufffd", "")
    if not cleaned:
        return []

    randomizer = rng or random.Random()
    out: list[str] = []

    def emit_line(line: str) -> None:
        graphemes = _grapheme_clusters(line)
        i = 0
        while i < len(graphemes):
            remaining = len(graphemes) - i
            if remaining <= max_size:
                out.append("".join(graphemes[i:]))
                break
            size = randomizer.randint(min_size, min(max_size, remaining))
            out.append("".join(graphemes[i : i + size]))
            i += size

    lines = cleaned.split("\n")
    for index, line in enumerate(lines):
        if index > 0:
            out.append("\n")
        if line:
            emit_line(line)
    return [piece for piece in out if piece]


def emit_sse_text_chunks(
    text: str,
    *,
    min_size: int = 16,
    max_size: int = 32,
    rng: random.Random | None = None,
) -> list[str]:
    """Normalize then split assistant-visible text for think/message SSE deltas."""
    return micro_chunk_for_sse(text, min_size=min_size, max_size=max_size, rng=rng)
