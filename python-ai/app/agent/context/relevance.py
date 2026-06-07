"""Turn-start relevance injection via hybrid RAG."""

from __future__ import annotations

import logging

from app.agent.schemas import AgentRunContext
from app.config import settings

logger = logging.getLogger(__name__)


async def inject_relevant_context(ctx: AgentRunContext) -> AgentRunContext:
    if not settings.agent_relevance_inject:
        return ctx
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    query = str(ctx.user_message or "").strip()
    if not novel_id or not query:
        return ctx
    try:
        from app.rag.hybrid_search import hybrid_search

        hits = await hybrid_search(novel_id, query, top_k=3)
    except Exception as exc:
        logger.warning("relevance inject skipped novel=%s: %s", novel_id, exc)
        return ctx
    if not hits:
        return ctx
    snippets = [
        {
            "chapter_id": h.get("chapter_id"),
            "title": h.get("title"),
            "content": (h.get("content") or "")[:600],
            "score": h.get("score") or h.get("rrf_score"),
        }
        for h in hits
    ]
    patch = dict(ctx.context_patch or {})
    patch["relevant_context"] = snippets
    return ctx.model_copy(update={"context_patch": patch})
