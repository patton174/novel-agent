"""Session RAG recall — inject retrieved turns into RUN_CONTEXT."""

from __future__ import annotations

import logging
from typing import Any

from app.agent.schemas import AgentRunContext
from app.config import settings

logger = logging.getLogger(__name__)

_SNIPPET_MAX = 720


def _trim(text: str, limit: int = _SNIPPET_MAX) -> str:
    body = str(text or "").strip()
    if len(body) <= limit:
        return body
    return body[: limit - 1] + "…"


def format_recalled_hits(
    hits: list[dict[str, Any]],
    *,
    query_plan: dict[str, Any] | None = None,
) -> dict[str, Any]:
    turns: list[dict[str, Any]] = []
    seen: set[str] = set()
    for hit in hits:
        key = str(hit.get("chunk_id") or hit.get("run_id") or "") + str(hit.get("turn_kind"))
        if key in seen:
            continue
        seen.add(key)
        turns.append(
            {
                "run_id": str(hit.get("run_id") or ""),
                "kind": str(hit.get("turn_kind") or hit.get("role") or ""),
                "role": str(hit.get("role") or ""),
                "tool": str(hit.get("tool_name") or "") or None,
                "snippet": _trim(str(hit.get("content") or "")),
                "score": round(
                    float(hit.get("rrf_score") or hit.get("score") or 0.0),
                    4,
                ),
                "created_at_ms": hit.get("created_at_ms"),
            }
        )
        if len(turns) >= int(getattr(settings, "agent_session_recall_top_k", 6) or 6):
            break

    block: dict[str, Any] = {
        "turns": turns,
        "hint": (
            "Auto-recalled from session memory index (embedding + BM25 + query rewrite). "
            "Snippets are excerpts — use SearchSessionHistory or re-call tools for full bodies."
        ),
    }
    if query_plan:
        block["query_plan"] = query_plan
    return block


async def inject_session_recall(ctx: AgentRunContext) -> AgentRunContext:
    """Turn-start session RAG: rewrite query → hybrid search → context_patch."""
    if not getattr(settings, "agent_session_recall_enabled", False):
        return ctx

    session_id = str(ctx.session_id or "").strip()
    query = str(ctx.user_message or "").strip()
    if not session_id or not query:
        return ctx

    try:
        from app.rag.session_search import search_session_for_ctx

        plan, hits = await search_session_for_ctx(ctx)
    except Exception as exc:
        logger.warning("session recall skipped session=%s: %s", session_id, exc)
        return ctx

    if not hits:
        return ctx

    plan_meta = {
        "primary": plan.primary,
        "variants": plan.variants[:5],
        "keywords": plan.keywords[:8],
        "rewrite_source": plan.rewrite_source,
    }
    recalled = format_recalled_hits(hits, query_plan=plan_meta)
    patch = dict(ctx.context_patch or {})
    patch["session_recalled"] = recalled
    return ctx.model_copy(update={"context_patch": patch})


async def index_session_run_recall(
    ctx: AgentRunContext,
    messages: list,
) -> None:
    """Run-end indexing into session Milvus collection."""
    if not getattr(settings, "agent_session_recall_enabled", False):
        return
    if not getattr(settings, "agent_session_recall_index_enabled", True):
        return
    try:
        from app.rag.session_index import index_session_run

        n = await index_session_run(ctx, messages)
        if n:
            logger.debug("session index upserted %d chunks run=%s", n, ctx.run_id)
    except Exception as exc:
        logger.warning("session index failed run=%s: %s", ctx.run_id, exc)
