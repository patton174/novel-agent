"""Run context enrichment — Content API as catalog source of truth."""

from __future__ import annotations

from app.agent.backend.chapter_store import fetch_chapter_summaries
from app.agent.schemas import AgentRunContext
from app.agent.tools.chapter_catalog import clear_chapter_rows_cache


async def refresh_chapters_from_content_api(
    ctx: AgentRunContext,
    *,
    force: bool = False,
) -> AgentRunContext:
    """Reload chapter rows from Content API (ignores stale in-memory snapshots when force=True)."""
    if not force:
        existing = [
            ch for ch in (ctx.chapters or []) if isinstance(ch, dict) and ch.get("id")
        ]
        if existing:
            return ctx
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if not novel_id or ctx.user_id <= 0:
        return ctx
    fresh = await fetch_chapter_summaries(ctx)
    if fresh is not None:
        return ctx.model_copy(update={"chapters": fresh})
    return ctx


async def bootstrap_run_context(ctx: AgentRunContext) -> AgentRunContext:
    """Run start: align ctx.chapters with Content API before first LLM turn."""
    clear_chapter_rows_cache()
    return await refresh_chapters_from_content_api(ctx, force=True)


async def enrich_context_for_run(
    ctx: AgentRunContext,
    *,
    refresh_chapters: bool = False,
) -> AgentRunContext:
    if refresh_chapters:
        clear_chapter_rows_cache()
        ctx = await refresh_chapters_from_content_api(ctx, force=True)
    return ctx


def enrich_context(ctx: AgentRunContext) -> AgentRunContext:
    return ctx
