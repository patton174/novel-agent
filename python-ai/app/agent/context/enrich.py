"""Run context enrichment before tool execution."""

from __future__ import annotations

from app.agent.backend.chapter_store import fetch_chapter_summaries
from app.agent.schemas import AgentRunContext


async def refresh_chapters_from_content_api(ctx: AgentRunContext) -> AgentRunContext:
    """Reload chapter list when Java assemble did not already provide catalog rows."""
    existing = [
        ch for ch in (ctx.chapters or []) if isinstance(ch, dict) and ch.get("id")
    ]
    if existing:
        return ctx
    fresh = await fetch_chapter_summaries(ctx)
    if fresh:
        return ctx.model_copy(update={"chapters": fresh})
    return ctx


async def enrich_context_for_run(
    ctx: AgentRunContext,
    *,
    refresh_chapters: bool = False,
) -> AgentRunContext:
    if refresh_chapters:
        ctx = await refresh_chapters_from_content_api(ctx)
    return ctx


def enrich_context(ctx: AgentRunContext) -> AgentRunContext:
    """Memory title index comes from Java assemble or /memory-nodes/tree-index."""
    return ctx
