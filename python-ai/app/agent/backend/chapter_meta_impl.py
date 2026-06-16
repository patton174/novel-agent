"""Chapter list position vs display title — for agent writes and persist errors."""

from __future__ import annotations

from typing import Any

from app.agent.backend.catalog_constants import API_SOURCE_HEADER
from app.agent.backend.chapter_title import strip_chapter_number_prefix
from app.agent.backend.ids import CHAPTER_ID_RE
from app.agent.context.compact import _chapter_sort_key
from app.agent.schemas import AgentRunContext

# 禁止作为持久化章节标题的占位名
_FORBIDDEN_CHAPTER_TITLES = frozenset({"新章节", "新对话", "未命名", "章节"})

CHAPTER_TITLE_REQUIRED_MSG = (
    "章节 Write/Edit 必须指定章节名：在正文前添加 YAML frontmatter，例如\n"
    "---\ntitle: 第一章 雨中\n---\n\n正文段落…"
)


def is_valid_chapter_title(title: str | None) -> bool:
    t = (title or "").strip()
    return bool(t) and t not in _FORBIDDEN_CHAPTER_TITLES


def catalog_chapter_title(ctx: AgentRunContext, chapter_id: str) -> str:
    cid = (chapter_id or "").strip()
    if not cid:
        return ""
    for ch in ctx.chapters or []:
        if isinstance(ch, dict) and str(ch.get("id") or "") == cid:
            return str(ch.get("title") or "").strip()
    return ""


def resolve_chapter_write_title(
    ctx: AgentRunContext | None,
    *,
    chapter_id: str,
    frontmatter_title: str,
) -> tuple[str | None, str | None]:
    """Resolve title for Content API persist. New chapters must set frontmatter title."""
    fm = strip_chapter_number_prefix((frontmatter_title or "").strip())
    if fm and not is_valid_chapter_title(fm):
        return None, "章节名不能使用「新章节」等占位名，请在 frontmatter 的 title 填写真实章节名。"
    if is_valid_chapter_title(fm):
        return fm, None
    cid = (chapter_id or "").strip()
    if ctx is not None and cid and CHAPTER_ID_RE.match(cid):
        existing = catalog_chapter_title(ctx, cid)
        if is_valid_chapter_title(existing):
            return existing, None
    return None, CHAPTER_TITLE_REQUIRED_MSG


def sorted_chapter_summaries(chapters: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = [dict(ch) for ch in chapters if isinstance(ch, dict) and ch.get("id")]
    ordered = sorted(rows, key=_chapter_sort_key)
    for index, ch in enumerate(ordered, start=1):
        ch["list_index"] = index
    return ordered


def resolve_chapter_write_meta(
    ctx: AgentRunContext,
    *,
    chapter_id: str,
    title: str,
) -> dict[str, Any]:
    """Attach title, sort_order, list_index (作品列表序) for persist + AI errors."""
    raw = [dict(ch) for ch in (ctx.chapters or []) if isinstance(ch, dict)]
    ordered = sorted_chapter_summaries(raw)
    cid = (chapter_id or "").strip()
    resolved_title = (title or "").strip()
    if not resolved_title and cid:
        resolved_title = catalog_chapter_title(ctx, cid)
    sort_order = 0
    list_index = 0
    if cid:
        for ch in ordered:
            if str(ch.get("id") or "") == cid:
                resolved_title = str(ch.get("title") or resolved_title).strip() or resolved_title
                sort_order = int(ch.get("sort_order") or 0)
                list_index = int(ch.get("list_index") or 0)
                break
    if not list_index and ordered:
        list_index = len(ordered) + 1
    display_label = format_chapter_display_label(
        resolved_title,
        list_index=list_index,
        sort_order=sort_order,
    )
    return {
        "chapter_id": cid,
        "title": resolved_title,
        "sort_order": sort_order,
        "list_index": list_index,
        "display_label": display_label,
    }


def format_chapter_index_read(chapters: list[dict[str, Any]]) -> str:
    """Human-readable chapter catalog for Read …/chapters/index.json (not raw JSON dump)."""
    ordered = sorted_chapter_summaries(
        [dict(ch) for ch in chapters if isinstance(ch, dict) and ch.get("id")]
    )
    lines = [
        API_SOURCE_HEADER,
        f"# 章节目录（作品库 {len(ordered)} 章，按 sort_order 排序）",
        "",
    ]
    for ch in ordered:
        cid = str(ch.get("id") or "")
        title = str(ch.get("title") or "未命名")
        sort_order = int(ch.get("sort_order") or 0)
        list_index = int(ch.get("list_index") or 0)
        words = int(ch.get("word_count") or 0)
        label = format_chapter_display_label(
            title,
            list_index=list_index,
            sort_order=sort_order,
        )
        lines.append(
            f"- {label} · id={cid} · sort_order={sort_order} · {words}字"
        )
    return "\n".join(lines)


def format_chapter_display_label(
    title: str,
    *,
    list_index: int,
    sort_order: int,
) -> str:
    """Human label: title may say 第5章 while list_index is 作品排序位."""
    base = (title or "章节").strip() or "章节"
    suffix: list[str] = []
    if list_index > 0:
        suffix.append(f"作品列表第{list_index}章")
    if sort_order > 0 and sort_order != list_index:
        suffix.append(f"sort_order={sort_order}")
    if suffix:
        return f"《{base}》（{'，'.join(suffix)}）"
    return f"《{base}》"
