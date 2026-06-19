"""Context enrichment before tool execution in SSE bridge."""

from __future__ import annotations

from app.agent.schemas import AgentRunContext


async def enrich_context_for_tool_step(
    ctx: AgentRunContext,
    *,
    refresh_chapters: bool = False,
) -> AgentRunContext:
    from app.agent.context.enrich import enrich_context_for_run

    return await enrich_context_for_run(ctx, refresh_chapters=refresh_chapters)
