"""Cross-chapter semantic duplicate detection via embeddings."""

from __future__ import annotations

import logging
import re
from typing import Any

from app.rag.embeddings import cosine_similarity, embed_texts

logger = logging.getLogger(__name__)

_SNIPPET_CHARS = 320
_SAMPLES_PER_CHAPTER = 3
_MIN_SNIPPET_CHARS = 80
_DEFAULT_THRESHOLD = 0.88
_MAX_CHAPTERS_SCAN = 96
_MAX_HITS = 24


def _normalize_snippet(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def _sample_snippets(body: str, *, n: int = _SAMPLES_PER_CHAPTER) -> list[str]:
    text = (body or "").strip()
    if not text:
        return []
    if len(text) <= _SNIPPET_CHARS * 2:
        return [_normalize_snippet(text)] if len(text) >= _MIN_SNIPPET_CHARS else []
    head = _normalize_snippet(text[:_SNIPPET_CHARS])
    tail = _normalize_snippet(text[-_SNIPPET_CHARS:])
    mid_start = max(0, (len(text) - _SNIPPET_CHARS) // 2)
    mid = _normalize_snippet(text[mid_start : mid_start + _SNIPPET_CHARS])
    out = [s for s in (head, mid, tail) if len(s) >= _MIN_SNIPPET_CHARS]
    return out[:n]


async def find_semantic_duplicates(
    chapters: list[tuple[str, str, str]],
    *,
    threshold: float = _DEFAULT_THRESHOLD,
) -> list[dict[str, Any]]:
    """
    Pairwise embedding similarity across chapter snippets.
    chapters: [(chapter_id, title, body), ...]
    """
    if len(chapters) < 2:
        return []

    limited = chapters[:_MAX_CHAPTERS_SCAN]
    samples: list[tuple[str, str, str, str]] = []
    for cid, title, body in limited:
        for idx, snippet in enumerate(_sample_snippets(body)):
            samples.append((cid, title, snippet, f"{cid}:{idx}"))

    if len(samples) < 2:
        return []

    try:
        vectors = await embed_texts([s[2] for s in samples])
    except Exception:
        logger.exception("semantic duplicate embed failed")
        return []

    hits: list[dict[str, Any]] = []
    seen_pairs: set[tuple[str, str]] = set()

    for i in range(len(samples)):
        for j in range(i + 1, len(samples)):
            cid_a, title_a, text_a, _ = samples[i]
            cid_b, title_b, text_b, _ = samples[j]
            if cid_a == cid_b:
                continue
            pair_key = tuple(sorted((cid_a, cid_b)))
            if pair_key in seen_pairs:
                continue
            sim = cosine_similarity(vectors[i], vectors[j])
            if sim < threshold:
                continue
            seen_pairs.add(pair_key)
            hits.append(
                {
                    "chapter_ids": [cid_a, cid_b],
                    "titles": [title_a, title_b],
                    "similarity": round(sim, 4),
                    "excerpt_a": text_a[:160],
                    "excerpt_b": text_b[:160],
                    "kind": "semantic",
                }
            )
            if len(hits) >= _MAX_HITS:
                return hits

    hits.sort(key=lambda h: float(h.get("similarity") or 0), reverse=True)
    return hits
