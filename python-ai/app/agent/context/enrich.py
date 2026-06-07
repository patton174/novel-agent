"""Run context enrichment before tool execution."""

from __future__ import annotations

from app.agent.backend.chapter_store import fetch_chapter_summaries
from app.agent.schemas import AgentRunContext

_MEMORY_TOOLS = frozenset({"Read", "Write", "Edit"})


async def refresh_chapters_from_content_api(ctx: AgentRunContext) -> AgentRunContext:
    """Reload chapter list from Content API (source of truth, not VFS file count)."""
    fresh = await fetch_chapter_summaries(ctx)
    if fresh:
        return ctx.model_copy(update={"chapters": fresh})
    return ctx


async def enrich_context_for_run(
    ctx: AgentRunContext,
    *,
    refresh_story_memory: bool = False,
    refresh_chapters: bool = False,
) -> AgentRunContext:
    if refresh_chapters:
        ctx = await refresh_chapters_from_content_api(ctx)
    return enrich_context(ctx, refresh_story_memory=refresh_story_memory)


def enrich_context(ctx: AgentRunContext, *, refresh_story_memory: bool = False) -> AgentRunContext:
    character_task = any(
        m in (ctx.user_message or "")
        for m in ("角色库", "角色", "人物卡", "删角色", "优化角色")
    )
    has_memory = bool(ctx.story_memory and str(ctx.story_memory).strip())
    should_refresh = refresh_story_memory or character_task or (
        has_memory and (ctx.last_tool or "") in _MEMORY_TOOLS
    )
    if has_memory and not should_refresh:
        return ctx
    from app.runtime.story_memory import render_story_memory_for_prompt

    memory = render_story_memory_for_prompt(
        ctx.session_id,
        user_id=ctx.user_id,
        novel_id=ctx.novel_id,
        project=ctx.project,
        max_len=1600 if character_task else 900,
    )
    if not memory:
        return ctx
    return ctx.model_copy(update={"story_memory": memory})
