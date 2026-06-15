"""Chapter reading-order helpers — resolve positions and build reorder payloads."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.agent.backend.chapter_meta import sorted_chapter_summaries
from app.agent.backend.chapter_title import (
    strip_chapter_number_prefix,
    title_has_chapter_number_prefix,
)

_EMPTY_CHAPTER_WORD_MIN = 100


def chapter_row_id(row: dict[str, Any]) -> str:
    return str(row.get("id") or row.get("chapter_id") or "").strip()


def audit_chapter_catalog(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Read-only chapter catalog checks after parallel writes."""
    ordered = sorted_chapter_summaries([dict(r) for r in rows if isinstance(r, dict)])
    dupes = duplicate_title_groups(ordered)
    duplicate_titles = {title: ids for title, ids in dupes.items()}
    stripped_buckets: dict[str, list[str]] = defaultdict(list)
    for row in ordered:
        cid = chapter_row_id(row)
        title = str(row.get("title") or "").strip()
        key = strip_chapter_number_prefix(title) or title
        if key and cid:
            stripped_buckets[key].append(cid)
    for key, ids in stripped_buckets.items():
        if len(ids) > 1 and key not in duplicate_titles:
            duplicate_titles[key] = ids
    empty_chapters: list[dict[str, Any]] = []
    title_has_number: list[dict[str, Any]] = []
    for row in ordered:
        cid = chapter_row_id(row)
        title = str(row.get("title") or "").strip()
        words = int(row.get("word_count") or 0)
        if words < _EMPTY_CHAPTER_WORD_MIN:
            empty_chapters.append(
                {
                    "chapter_id": cid,
                    "index": int(row.get("list_index") or 0),
                    "title": title,
                    "word_count": words,
                }
            )
        if title_has_chapter_number_prefix(title):
            title_has_number.append(
                {
                    "chapter_id": cid,
                    "index": int(row.get("list_index") or 0),
                    "title": title,
                    "suggested_title": strip_chapter_number_prefix(title),
                }
            )
    issue_count = len(duplicate_titles) + len(empty_chapters) + len(title_has_number)
    return {
        "ok": issue_count == 0,
        "chapter_count": len(ordered),
        "duplicate_titles": duplicate_titles,
        "empty_chapters": empty_chapters,
        "title_has_chapter_number": title_has_number,
    }


def format_chapter_audit_message(audit: dict[str, Any]) -> str:
    if audit.get("ok"):
        return ""
    lines = [
        "【系统】并行写章后目录审查发现以下问题，请用 ReorderChapters / EditChapter / DeleteChapter 修正，"
        "或调用 ChapterAudit 查看详情："
    ]
    dupes = audit.get("duplicate_titles")
    if isinstance(dupes, dict) and dupes:
        for title, ids in list(dupes.items())[:6]:
            lines.append(f"- 重复标题「{title}」：{', '.join(ids)}")
    empty = audit.get("empty_chapters")
    if isinstance(empty, list) and empty:
        for item in empty[:6]:
            if isinstance(item, dict):
                lines.append(
                    f"- 空章/过短 [{item.get('chapter_id')}] "
                    f"index={item.get('index')} 「{item.get('title')}」({item.get('word_count')}字)"
                )
    numbered = audit.get("title_has_chapter_number")
    if isinstance(numbered, list) and numbered:
        for item in numbered[:6]:
            if isinstance(item, dict):
                lines.append(
                    f"- 标题含章号 [{item.get('chapter_id')}] "
                    f"「{item.get('title')}」→ 建议改为「{item.get('suggested_title')}」"
                )
    return "\n".join(lines)


def ordered_chapter_ids(rows: list[dict[str, Any]]) -> list[str]:
    ordered = sorted_chapter_summaries([dict(r) for r in rows if isinstance(r, dict)])
    return [cid for r in ordered if (cid := chapter_row_id(r))]


def find_chapter_index(rows: list[dict[str, Any]], chapter_id: str) -> int | None:
    cid = (chapter_id or "").strip()
    if not cid:
        return None
    for index, row in enumerate(sorted_chapter_summaries([dict(r) for r in rows if isinstance(r, dict)]), start=1):
        if chapter_row_id(row) == cid:
            return index
    return None


def duplicate_title_groups(rows: list[dict[str, Any]]) -> dict[str, list[str]]:
    buckets: dict[str, list[str]] = defaultdict(list)
    ordered = sorted_chapter_summaries([dict(r) for r in rows if isinstance(r, dict)])
    for row in ordered:
        title = str(row.get("title") or "").strip()
        cid = chapter_row_id(row)
        if title and cid:
            buckets[title].append(cid)
    return {title: ids for title, ids in buckets.items() if len(ids) > 1}


def resolve_target_position(
    rows: list[dict[str, Any]],
    *,
    chapter_id: str = "",
    position: int | None = None,
    sort_order: int | None = None,
    after_chapter_id: str | None = None,
    before_chapter_id: str | None = None,
) -> tuple[int | None, str | None]:
    """Return 1-based target position in reading order."""
    ordered = sorted_chapter_summaries([dict(r) for r in rows if isinstance(r, dict)])
    count = len(ordered)
    cid = (chapter_id or "").strip()
    current_index = find_chapter_index(ordered, cid) if cid else None

    pos = position if position is not None else sort_order
    after_id = (after_chapter_id or "").strip()
    before_id = (before_chapter_id or "").strip()

    if after_id and before_id:
        return None, "Use either after_chapter_id or before_chapter_id, not both."

    if after_id:
        anchor = find_chapter_index(ordered, after_id)
        if anchor is None:
            return None, f"after_chapter_id not found: {after_id}"
        pos = anchor + 1
    elif before_id:
        anchor = find_chapter_index(ordered, before_id)
        if anchor is None:
            return None, f"before_chapter_id not found: {before_id}"
        pos = anchor

    if pos is None:
        if current_index is not None:
            return current_index, None
        return count + 1 if cid not in ordered_chapter_ids(ordered) else count, None

    if pos < 1:
        return None, "position must be >= 1"
    max_pos = count + (0 if current_index is not None else 1)
    if pos > max_pos:
        pos = max_pos
    return pos, None


def insert_id_at_position(ids: list[str], chapter_id: str, position: int) -> list[str]:
    cid = (chapter_id or "").strip()
    if not cid:
        return ids
    working = [item for item in ids if item != cid]
    index = max(0, min(position - 1, len(working)))
    working.insert(index, cid)
    return working


def apply_moves(ids: list[str], moves: list[tuple[str, int]]) -> tuple[list[str], str | None]:
    working = list(ids)
    for chapter_id, position in moves:
        cid = (chapter_id or "").strip()
        if not cid:
            return working, "move chapter_id is empty"
        if cid not in working:
            return working, f"chapter_id not in catalog: {cid}"
        working = insert_id_at_position(working, cid, position)
    return working, None


def build_reorder_ids(
    rows: list[dict[str, Any]],
    *,
    chapter_ids: list[str] | None = None,
    moves: list[tuple[str, int]] | None = None,
) -> tuple[list[str], str | None]:
    current = ordered_chapter_ids(rows)
    known = set(current)

    if moves:
        return apply_moves(current, moves)

    if not chapter_ids:
        return [], "Provide chapter_ids or moves."

    cleaned = [str(cid).strip() for cid in chapter_ids if str(cid).strip()]
    if not cleaned:
        return [], "chapter_ids is empty"

    missing = [cid for cid in cleaned if cid not in known]
    if missing:
        return [], f"Unknown chapter_id(s): {', '.join(missing[:3])}"

    extras = [cid for cid in current if cid not in cleaned]
    if extras:
        cleaned = cleaned + extras

    return cleaned, None


def chapter_list_items(rows: list[dict[str, Any]], *, include_summary: bool) -> list[dict[str, Any]]:
    ordered = sorted_chapter_summaries([dict(r) for r in rows if isinstance(r, dict)])
    dupes = duplicate_title_groups(ordered)
    dupe_ids = {cid for ids in dupes.values() for cid in ids[1:]}
    items: list[dict[str, Any]] = []
    for row in ordered:
        cid = chapter_row_id(row)
        title = str(row.get("title") or "未命名")
        item: dict[str, Any] = {
            "index": int(row.get("list_index") or 0),
            "chapter_id": cid,
            "title": title,
            "word_count": int(row.get("word_count") or 0),
            "duplicate_title": cid in dupe_ids,
        }
        if include_summary and row.get("summary"):
            item["summary"] = str(row.get("summary"))
        items.append(item)
    return items


def format_chapter_list_text(rows: list[dict[str, Any]], *, project_title: str = "") -> str:
    items = chapter_list_items(rows, include_summary=False)
    dupes = duplicate_title_groups(
        sorted_chapter_summaries([dict(r) for r in rows if isinstance(r, dict)])
    )
    lines = [f"全书 {len(items)} 章（index = 阅读顺序，chapter_id = 操作 ID）"]
    if project_title:
        lines[0] = f"《{project_title}》{lines[0]}"
    for item in items:
        flag = " [duplicate title]" if item.get("duplicate_title") else ""
        lines.append(
            f"{item['index']}. [{item['chapter_id']}] {item['title']} ({item['word_count']}字){flag}"
        )
    if dupes:
        sample = ", ".join(f"「{title}」×{len(ids)}" for title, ids in list(dupes.items())[:3])
        lines.append(f"重复标题: {sample}")
    if not items:
        lines.append("（暂无章节）")
    return "\n".join(lines)
