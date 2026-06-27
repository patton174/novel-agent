"""Session hybrid retrieval with multi-query rewrite fusion."""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Any

from app.config import settings
from app.rag.hybrid_search import reciprocal_rank_fusion, rerank
from app.rag.query_rewrite import RetrievalQueryPlan, build_retrieval_query_plan
from app.rag.session_index import (
    chapter_hint_from_ctx,
    list_session_chunks,
    recent_turns_from_history,
    vector_search_session,
)
from app.agent.schemas import AgentRunContext

_TOKEN_RE = re.compile(r"[\w\u4e00-\u9fff]+", re.UNICODE)


def _hit_key(hit: dict[str, Any]) -> str:
    chunk_id = hit.get("chunk_id")
    if chunk_id:
        return str(chunk_id)
    return f"{hit.get('run_id')}:{hit.get('turn_kind')}:{str(hit.get('content') or '')[:80]}"


def _tokenize(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text or "") if t.strip()]


def bm25_session_recall(
    session_id: str,
    query: str,
    *,
    top_k: int = 20,
) -> list[dict[str, Any]]:
    query_tokens = _tokenize(query)
    if not query_tokens:
        return []

    docs = list_session_chunks(session_id)
    if not docs:
        return []

    tokenized_docs = [
        _tokenize(
            f"{d.get('turn_kind') or ''} {d.get('tool_name') or ''} {d.get('content') or ''}"
        )
        for d in docs
    ]
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


async def _recall_for_query(
    session_id: str,
    query: str,
    *,
    vector_k: int,
    bm25_k: int,
) -> list[dict[str, Any]]:
    vec_hits = await vector_search_session(session_id, query, top_k=vector_k)
    bm25_hits = bm25_session_recall(session_id, query, top_k=bm25_k)
    if not vec_hits and not bm25_hits:
        return []
    if not vec_hits:
        return bm25_hits
    if not bm25_hits:
        return vec_hits
    return reciprocal_rank_fusion(vec_hits, bm25_hits)


async def hybrid_session_search(
    session_id: str,
    query_plan: RetrievalQueryPlan,
    *,
    top_k: int = 6,
    vector_k: int | None = None,
    bm25_k: int | None = None,
) -> list[dict[str, Any]]:
    """Multi-query hybrid search: embed each rewritten query, fuse with RRF."""
    if not session_id.strip():
        return []

    vk = vector_k or int(getattr(settings, "agent_session_recall_vector_k", 24) or 24)
    bk = bm25_k or int(getattr(settings, "agent_session_recall_bm25_k", 24) or 24)
    max_q = int(getattr(settings, "agent_session_query_rewrite_max_queries", 6) or 6)
    queries = query_plan.all_queries(max_queries=max_q)
    if not queries:
        return []

    ranked_lists: list[list[dict[str, Any]]] = []
    for q in queries:
        hits = await _recall_for_query(session_id, q, vector_k=vk, bm25_k=bk)
        if hits:
            ranked_lists.append(hits)

    if not ranked_lists:
        return []
    if len(ranked_lists) == 1:
        fused = ranked_lists[0]
    else:
        fused = reciprocal_rank_fusion(*ranked_lists)

    reranked = await rerank(query_plan.primary, fused)
    return reranked[:top_k]


async def build_query_plan_for_ctx(ctx: AgentRunContext) -> RetrievalQueryPlan:
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    return await build_retrieval_query_plan(
        user_message=str(ctx.user_message or ""),
        session_id=str(ctx.session_id or ""),
        novel_id=novel_id,
        chapter_hint=chapter_hint_from_ctx(ctx),
        recent_turns=recent_turns_from_history(ctx),
    )


async def search_session_for_ctx(
    ctx: AgentRunContext,
    *,
    top_k: int | None = None,
) -> tuple[RetrievalQueryPlan, list[dict[str, Any]]]:
    return await search_session_with_query(
        ctx,
        str(ctx.user_message or ""),
        top_k=top_k,
    )


async def search_session_with_query(
    ctx: AgentRunContext,
    query: str,
    *,
    top_k: int | None = None,
) -> tuple[RetrievalQueryPlan, list[dict[str, Any]]]:
    session_id = str(ctx.session_id or "").strip()
    q = str(query or "").strip()
    if not session_id or not q:
        plan = RetrievalQueryPlan(primary=q, rewrite_source="empty")
        return plan, []

    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    plan = await build_retrieval_query_plan(
        user_message=q,
        session_id=session_id,
        novel_id=novel_id,
        chapter_hint=chapter_hint_from_ctx(ctx),
        recent_turns=recent_turns_from_history(ctx),
    )
    k = top_k or int(getattr(settings, "agent_session_recall_top_k", 6) or 6)
    hits = await hybrid_session_search(session_id, plan, top_k=k)
    return plan, hits
