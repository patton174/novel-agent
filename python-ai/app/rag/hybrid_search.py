"""Hybrid retrieval — vector recall + BM25 + optional rerank."""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Any

from app.config import settings
from app.rag.chapter_index import list_novel_chunks, vector_search

_RRF_K = 60
_TOKEN_RE = re.compile(r"[\w\u4e00-\u9fff]+", re.UNICODE)


def _hit_key(hit: dict[str, Any]) -> str:
    chunk_id = hit.get("chunk_id")
    if chunk_id:
        return str(chunk_id)
    content = (hit.get("content") or "")[:120]
    return f"{hit.get('chapter_id')}:{content}"


def reciprocal_rank_fusion(*ranked_lists: list[dict[str, Any]], k: int = _RRF_K) -> list[dict[str, Any]]:
    """Fuse multiple ranked hit lists with reciprocal rank fusion."""
    scores: dict[str, float] = {}
    items: dict[str, dict[str, Any]] = {}
    for hits in ranked_lists:
        for rank, hit in enumerate(hits, start=1):
            key = _hit_key(hit)
            scores[key] = scores.get(key, 0.0) + 1.0 / (k + rank)
            items[key] = hit
    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    fused: list[dict[str, Any]] = []
    for key, score in ordered:
        hit = dict(items[key])
        hit["rrf_score"] = score
        fused.append(hit)
    return fused


def _tokenize(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text or "") if t.strip()]


def bm25_recall(
    novel_id: str,
    query: str,
    *,
    top_k: int = 20,
) -> list[dict[str, Any]]:
    """Lexical BM25 over in-memory corpus for the novel namespace."""
    query_tokens = _tokenize(query)
    if not query_tokens:
        return []

    docs = list_novel_chunks(novel_id)
    if not docs:
        return []

    tokenized_docs = [_tokenize((d.get("title") or "") + " " + (d.get("content") or "")) for d in docs]
    doc_freq: Counter[str] = Counter()
    for tokens in tokenized_docs:
        doc_freq.update(set(tokens))

    n_docs = len(tokenized_docs)
    avgdl = sum(len(tokens) for tokens in tokenized_docs) / max(n_docs, 1)
    k1, b = 1.5, 0.75

    scored: list[tuple[float, dict[str, Any]]] = []
    for doc, tokens in zip(docs, tokenized_docs):
        if not tokens:
            continue
        tf = Counter(tokens)
        dl = len(tokens)
        score = 0.0
        for term in query_tokens:
            if term not in tf:
                continue
            df = doc_freq.get(term, 0)
            idf = math.log(1 + (n_docs - df + 0.5) / (df + 0.5))
            freq = tf[term]
            denom = freq + k1 * (1 - b + b * dl / max(avgdl, 1))
            score += idf * (freq * (k1 + 1)) / max(denom, 1e-9)
        if score > 0:
            hit = dict(doc)
            hit["score"] = score
            scored.append((score, hit))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [hit for _, hit in scored[:top_k]]


async def rerank(query: str, hits: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Lightweight lexical reranker (placeholder for bge-reranker when enabled)."""
    if not settings.rag_rerank_enabled or not hits:
        return hits

    q_tokens = set(_tokenize(query))
    if not q_tokens:
        return hits

    def _score(hit: dict[str, Any]) -> float:
        text = (hit.get("content") or "") + " " + (hit.get("title") or "")
        t_tokens = set(_tokenize(text))
        overlap = len(q_tokens & t_tokens)
        base = float(hit.get("rrf_score") or hit.get("score") or 0.0)
        return base + overlap / max(len(q_tokens), 1)

    return sorted(hits, key=_score, reverse=True)


async def vector_recall(
    novel_id: str,
    query: str,
    *,
    top_k: int = 20,
) -> list[dict[str, Any]]:
    return await vector_search(novel_id, query, top_k=top_k)


async def hybrid_search(
    novel_id: str,
    query: str,
    *,
    top_k: int = 5,
    vector_k: int = 20,
    bm25_k: int = 20,
) -> list[dict[str, Any]]:
    if not query.strip():
        return []

    vec_hits = await vector_recall(novel_id, query, top_k=vector_k)
    bm25_hits = bm25_recall(novel_id, query, top_k=bm25_k)
    if not vec_hits and not bm25_hits:
        return []
    if not vec_hits:
        fused = bm25_hits
    elif not bm25_hits:
        fused = vec_hits
    else:
        fused = reciprocal_rank_fusion(vec_hits, bm25_hits)

    reranked = await rerank(query, fused)
    return reranked[:top_k]
