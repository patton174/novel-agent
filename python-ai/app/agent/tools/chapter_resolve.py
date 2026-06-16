"""Resolve chapter_id from catalog by id, title, or reading-order index."""

from __future__ import annotations

import re
from typing import Any

from app.agent.backend.chapter_meta import sorted_chapter_summaries
from app.agent.backend.chapter_title import strip_chapter_number_prefix
from app.agent.tools.chapter_position import chapter_row_id

_CHAPTER_ID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.I,
)


def _ordered_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted_chapter_summaries([dict(r) for r in rows if isinstance(r, dict)])


def _catalog_hint(rows: list[dict[str, Any]], *, limit: int = 5) -> str:
    ordered = _ordered_rows(rows)
    if not ordered:
        return "catalog is empty — call ListChapters first"
    lines = [f"{i}. [{chapter_row_id(r)}] {r.get('title') or '未命名'}" for i, r in enumerate(ordered[:limit], start=1)]
    if len(ordered) > limit:
        lines.append(f"…共 {len(ordered)} 章")
    return "; ".join(lines)


def _resolve_by_title(
    ordered: list[dict[str, Any]], title: str
) -> tuple[dict[str, Any] | None, str | None]:
    want = (title or "").strip()
    if not want:
        return None, "title is empty"
    exact = [r for r in ordered if str(r.get("title") or "").strip() == want]
    if len(exact) == 1:
        return exact[0], None
    if len(exact) > 1:
        ids = ", ".join(chapter_row_id(r) for r in exact[:4])
        return None, f"ambiguous title «{want}» — multiple chapters: {ids}"
    stripped_want = strip_chapter_number_prefix(want) or want
    loose = [
        r
        for r in ordered
        if (strip_chapter_number_prefix(str(r.get("title") or "").strip()) or str(r.get("title") or "").strip())
        == stripped_want
    ]
    if len(loose) == 1:
        return loose[0], None
    if len(loose) > 1:
        ids = ", ".join(chapter_row_id(r) for r in loose[:4])
        return None, f"ambiguous title «{want}» (after stripping 第N章): {ids}"
    return None, f"no chapter titled «{want}»"


def resolve_chapter_row(
    rows: list[dict[str, Any]],
    *,
    chapter_id: str | None = None,
    title: str | None = None,
    index: int | None = None,
) -> tuple[dict[str, Any] | None, str | None]:
    """Resolve one chapter row. index is 1-based reading order (ListChapters index)."""
    ordered = _ordered_rows(rows)
    cid = (chapter_id or "").strip()
    if cid:
        for row in ordered:
            if chapter_row_id(row) == cid:
                return row, None
        if not _CHAPTER_ID_RE.match(cid):
            row, _ = _resolve_by_title(ordered, cid)
            if row is not None:
                return row, None
        return None, f"chapter not found: {cid} ({_catalog_hint(ordered)})"
    if index is not None:
        if index < 1:
            return None, "index must be >= 1"
        if index > len(ordered):
            return None, f"index {index} out of range (1–{len(ordered)})"
        return ordered[index - 1], None
    if title and title.strip():
        row, err = _resolve_by_title(ordered, title.strip())
        if row is not None:
            return row, None
        return None, f"{err} ({_catalog_hint(ordered)})"
    return None, f"provide chapter_id, title, or index ({_catalog_hint(ordered)})"
