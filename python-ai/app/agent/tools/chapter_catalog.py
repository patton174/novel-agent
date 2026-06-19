"""Chapter row catalog — reading-order rows, live refresh, unified target resolution."""

from __future__ import annotations

import contextvars
from typing import Any

from app.agent.backend.chapter_meta import sorted_chapter_summaries
from app.agent.backend.chapter_store import fetch_chapter_summaries, resolve_chapter_row_api
from app.agent.schemas import AgentRunContext
from app.agent.tools.chapter_position import chapter_list_items, chapter_row_id, format_chapter_list_text
from app.agent.tools.chapter_resolve import resolve_chapter_row

_chapter_rows_batch_cache: contextvars.ContextVar[list[dict[str, Any]] | None] = contextvars.ContextVar(
    "chapter_rows_batch_cache",
    default=None,
)

CHAPTER_CATALOG_TOOLS = frozenset(
    {
        "ReadChapter",
        "EditChapter",
        "DeleteChapter",
        "WriteChapter",
        "ReorderChapters",
        "ChapterAudit",
    }
)


def clear_chapter_rows_cache() -> None:
    _chapter_rows_batch_cache.set(None)


async def prime_chapter_rows_cache(ctx: AgentRunContext) -> list[dict[str, Any]]:
    """Load catalog once for a parallel tool batch; subsequent resolves reuse it."""
    cached = _chapter_rows_batch_cache.get()
    if cached is not None:
        return list(cached)
    rows = await fetch_chapter_summaries(ctx)
    _chapter_rows_batch_cache.set(rows)
    return rows


async def load_chapter_rows(ctx: AgentRunContext) -> list[dict[str, Any]]:
    """Fetch chapters from Content API; uses batch cache when primed."""
    cached = _chapter_rows_batch_cache.get()
    if cached is not None:
        return list(cached)
    return await fetch_chapter_summaries(ctx)


def chapter_rows_patch(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Patch keys to keep RUN_CONTEXT catalog aligned with Content API."""
    if not rows:
        return {}
    ordered = sorted_chapter_summaries([dict(r) for r in rows if isinstance(r, dict)])
    return {"chapters": ordered}


async def resolve_chapter_target(
    ctx: AgentRunContext,
    *,
    chapter_id: str | None = None,
    title: str | None = None,
    index: int | None = None,
) -> tuple[dict[str, Any] | None, list[dict[str, Any]], str | None]:
    """Resolve one chapter row by id, title, or 1-based reading-order index."""
    rows = await load_chapter_rows(ctx)
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    has_target = bool(str(chapter_id or "").strip() or str(title or "").strip() or index is not None)
    if novel_id and ctx.user_id > 0 and has_target:
        api_row, api_err = await resolve_chapter_row_api(
            ctx,
            chapter_id=chapter_id,
            title=title,
            index=index,
        )
        if api_row:
            return api_row, rows, None
        if api_err and not api_err.startswith("chapter resolve failed HTTP"):
            return None, rows, api_err
    row, err = resolve_chapter_row(
        rows,
        chapter_id=chapter_id,
        title=title,
        index=index,
    )
    return row, rows, err


def chapter_row_meta(row: dict[str, Any]) -> dict[str, Any]:
    """Stable row fields for tool results and SSE labels."""
    return {
        "chapter_id": chapter_row_id(row),
        "index": int(row.get("list_index") or 0),
        "title": str(row.get("title") or "未命名"),
        "sort_order": int(row.get("sort_order") or 0),
        "word_count": int(row.get("word_count") or 0),
    }


async def enrich_stream_chapter_input(
    ctx: AgentRunContext,
    inp: dict[str, Any],
) -> tuple[dict[str, Any], str | None]:
    """Resolve chapter row target and attach chapter_id/title/index for streaming."""
    row, _rows, err = await resolve_chapter_target(
        ctx,
        chapter_id=str(inp.get("chapter_id") or "") or None,
        title=str(inp.get("title") or "") or None,
        index=inp.get("index"),
    )
    if err or not row:
        return inp, err or "chapter not found"
    meta = chapter_row_meta(row)
    out = dict(inp)
    out["chapter_id"] = meta["chapter_id"]
    out["index"] = meta["index"]
    if not str(out.get("title") or "").strip():
        out["title"] = meta["title"]
    return out, None


def format_catalog_list_text(
    rows: list[dict[str, Any]], *, project_title: str = ""
) -> str:
    return format_chapter_list_text(rows, project_title=project_title)


def catalog_list_items(
    rows: list[dict[str, Any]], *, include_summary: bool = False
) -> list[dict[str, Any]]:
    return chapter_list_items(rows, include_summary=include_summary)


def batch_needs_chapter_catalog(tool_names: list[str]) -> bool:
    return any(name in CHAPTER_CATALOG_TOOLS for name in tool_names)
