"""Reject mis-scoped chapter memory writes; no auto-redirect (model retries)."""

from __future__ import annotations

import re
from typing import Any

from app.agent.backend.ids import CHAPTER_ID_RE, novel_root
from app.agent.context.compact import find_chapter_id_by_title
from app.agent.schemas import AgentRunContext

_CHAPTER_TITLE_HINT_RE = re.compile(
    r"第\s*\d+\s*章|chapter\s*\d+",
    re.IGNORECASE,
)


def _envelope_title(envelope: dict[str, Any]) -> str:
    return str(envelope.get("title") or "").strip()


def _envelope_data(envelope: dict[str, Any]) -> dict[str, Any]:
    data = envelope.get("data")
    return data if isinstance(data, dict) else {}


def _looks_like_chapter_entry(entry_id: str, title: str) -> bool:
    for text in (entry_id, title):
        t = (text or "").strip()
        if not t:
            continue
        if CHAPTER_ID_RE.match(t):
            return True
        if _CHAPTER_TITLE_HINT_RE.search(t):
            return True
    return False


def _chapter_style_payload(data: dict[str, Any]) -> bool:
    if "摘要" in data:
        return True
    return any(k in data for k in ("伏笔", "约束", "剧情节点"))


def _chapter_memory_path(ctx: AgentRunContext, chapter_id: str) -> str:
    from app.agent.backend.memory_catalog import memory_path_segment

    nid = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    root = novel_root(nid)
    seg = memory_path_segment(chapter_id)
    return f"{root}/memory/chapter/{seg}.json"


def validate_memory_write_target(
    ctx: AgentRunContext,
    scope: str,
    entry_id: str,
    envelope: dict[str, Any],
) -> str | None:
    """Return tool error text, or None when path is acceptable."""
    scope_norm = (scope or "").strip().lower()
    entry = (entry_id or "").strip()
    title = _envelope_title(envelope)
    data = _envelope_data(envelope)

    if scope_norm == "chapter":
        if CHAPTER_ID_RE.match(entry):
            return None
        hint = ""
        for candidate in (entry, title):
            cid = find_chapter_id_by_title(ctx, candidate)
            if cid:
                hint = f" 应使用：{_chapter_memory_path(ctx, cid)}"
                break
        example = hint or f" 示例：{_chapter_memory_path(ctx, '<chapter_id>')}"
        return (
            "章节记忆路径必须使用 chapter_catalog 中的 chapter_id（UUID），"
            f"禁止用章节名作 key。{example}"
        )

    if scope_norm != "novel":
        return None

    misfiled = (
        _looks_like_chapter_entry(entry, title)
        or _chapter_style_payload(data)
        or bool(find_chapter_id_by_title(ctx, entry) or find_chapter_id_by_title(ctx, title))
    )
    if not misfiled:
        return None

    hint = ""
    for candidate in (entry, title):
        cid = find_chapter_id_by_title(ctx, candidate)
        if cid:
            hint = f" 应使用：{_chapter_memory_path(ctx, cid)}"
            break
    write_hint = hint or f" 请 Write {_chapter_memory_path(ctx, '<chapter_id>')}，"
    return (
        "逐章剧情/摘要/伏笔属于「章节记忆」，禁止写入 /memory/novel/（大纲/创作规划）。"
        f"{write_hint}"
        "data 必填「摘要」Markdown；路径 key 为 chapter_catalog 的 UUID。"
    )
