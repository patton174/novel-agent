"""Turn-start KG snapshot injection (when kg_enabled)."""

from __future__ import annotations

import logging

from app.agent.schemas import AgentRunContext
from app.config import settings
from app.kg.query import format_kg_snapshot, novel_graph

logger = logging.getLogger(__name__)


async def inject_kg_context(ctx: AgentRunContext) -> AgentRunContext:
    if not settings.kg_enabled:
        return ctx
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if not novel_id:
        return ctx
    try:
        raw = await novel_graph(novel_id)
    except Exception as exc:
        logger.warning("kg snapshot skipped novel=%s: %s", novel_id, exc)
        return ctx
    snapshot = format_kg_snapshot(raw)
    if not snapshot:
        return ctx
    patch = dict(ctx.context_patch or {})
    patch["kg_snapshot"] = snapshot
    return ctx.model_copy(update={"context_patch": patch})
