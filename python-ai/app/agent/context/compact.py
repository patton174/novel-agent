"""Compact agent context: chapter window, onboarding filter, memory summaries."""

from __future__ import annotations

import json
import re
from typing import Any

from app.agent.schemas import AgentRunContext

CHAPTER_WINDOW_RADIUS = 5
# List API only returns word_count — not body; treat as written when count is high enough.
CHAPTER_WRITTEN_WORD_MIN = 100

# --- Chapter info chain (window → list → read); keep wording in sync across surfaces ---
CHAPTER_WINDOW_SCOPE_NOTE = (
    "【省略版·章节概览】最近若干章的 index/chapter_id/title/字数（无正文）。"
    "全书章表 → RUN_CONTEXT `chapter_catalog`（Content API）。"
    "ReadChapter 须显式传 index 或 chapter_id（可从本段复制）。"
)

CHAPTER_LIST_SCOPE_NOTE = (
    "【章节目录】index=阅读顺序，chapter_id=工具 ID，word_count=字数。"
    "标题为纯文本（勿写第N章前缀，UI 用 index 显示章序）。"
    "WriteChapter 可用 position / after_chapter_id 指定位置（默认追加）；"
    "ReorderChapters 可用 moves 局部调序；DeleteChapter 可用 dedupe_title 去重；"
    "并行写章后可用 ChapterAudit 审查。"
)

CHAPTER_DB_CATALOG_NOTE = (
    "【作品库章表】数据存 PostgreSQL（Content API）。用 ListChapters 或本章表的 chapter_id 操作章节，"
    "禁止构造路径。以本章表的字数/状态为准。"
)

CHAPTER_INFO_CHAIN_FOR_PROMPT = """## 作品库与记忆（Content API，无 VFS 路径）
| 来源 | 说明 | 工具字段 |
|------|------|----------|
| RUN_CONTEXT `chapter_catalog` | 全书章节元数据 | chapter_id, index, title |
| RUN_CONTEXT `chapter_window` | 最近章节摘要（含 chapter_id） | chapter_id, index |
| RUN_CONTEXT `memory_index` | 故事记忆标题索引 | memory_id, scope, title |
| ListChapters | 章表 JSON（与 catalog 同字段名） | chapter_id, index |
| ListMemory / GetMemoryTree | 记忆节点列表/树 | memory_id |

盘点章节 → chapter_catalog 或 ListChapters；盘点记忆 → memory_index 或 ListMemory。
WriteChapter 禁止预填 content；ReadChapter/EditChapter 禁止空参数 {}。"""
_ONBOARDING_HINTS = (
    "你好！当前正在创作",
    "我已读取本书简介",
    "描述场景、人物或情节",
    "切换到「世界观」模式",
    "我可以帮你续写",
)

_WORLD_VALUE_MAX = 160
_CHARACTER_PREVIEW_MAX = 100


def is_onboarding_assistant_text(text: str) -> bool:
    t = (text or "").strip()
    if not t:
        return False
    return any(h in t for h in _ONBOARDING_HINTS)


def effective_chapter_text(ctx: AgentRunContext) -> str:
    text = (ctx.chapter_text or "").strip()
    if not text or is_onboarding_assistant_text(text):
        return ""
    return text


def chapter_has_substantial_body(ch: dict[str, Any]) -> bool:
    try:
        wc = int(ch.get("word_count") or ch.get("wordCount") or 0)
    except (TypeError, ValueError):
        wc = 0
    if wc >= CHAPTER_WRITTEN_WORD_MIN:
        return True
    content = str(ch.get("content") or "").strip()
    if len(content) >= 400:
        return True
    summary = str(ch.get("summary") or "").strip()
    return len(summary) >= 120


def _chapter_sort_key(ch: dict[str, Any]) -> tuple[int, str]:
    order = ch.get("sort_order")
    try:
        n = int(order)
    except (TypeError, ValueError):
        n = 0
    return (n, str(ch.get("title") or ""))


def latest_chapter(ctx: AgentRunContext) -> dict[str, Any] | None:
    chapters = [ch for ch in (ctx.chapters or []) if isinstance(ch, dict) and ch.get("id")]
    if not chapters:
        return None
    return sorted(chapters, key=_chapter_sort_key)[-1]


def latest_chapter_id(ctx: AgentRunContext) -> str | None:
    ch = latest_chapter(ctx)
    if not ch:
        return None
    cid = str(ch.get("id") or "").strip()
    return cid or None


def ctx_with_write_anchor(ctx: AgentRunContext) -> AgentRunContext:
    """No-op: chapter focus comes from ctx.chapters metadata, not the editor cursor."""
    return ctx


def latest_written_chapter_id(ctx: AgentRunContext) -> str | None:
    """Latest chapter in list that already has substantial body (ignore editor open tab)."""
    chapters = sorted(
        [ch for ch in (ctx.chapters or []) if isinstance(ch, dict) and ch.get("id")],
        key=_chapter_sort_key,
    )
    for ch in reversed(chapters):
        if chapter_has_substantial_body(ch):
            cid = str(ch.get("id") or "").strip()
            if cid:
                return cid
    return latest_chapter_id(ctx)


def _chapter_sort_label(ch: dict[str, Any]) -> str:
    try:
        n = int(ch.get("sort_order") or 0)
    except (TypeError, ValueError):
        n = 0
    return f"sort={n}" if n else "sort=?"


def _chapter_catalog_line(ch: dict[str, Any]) -> str:
    """Full DB row for RUN_CONTEXT chapter_catalog (tool_contract field names)."""
    from app.agent.harness.tool_contract import format_chapter_catalog_line

    return format_chapter_catalog_line(ch)


def format_chapter_catalog_db(ctx: AgentRunContext, *, max_chars: int = 6500) -> str:
    """全书章节元数据（Content API / ctx.chapters），供模型盘点进度。"""
    from app.agent.backend.chapter_meta import sorted_chapter_summaries

    raw = [ch for ch in (ctx.chapters or []) if isinstance(ch, dict) and ch.get("id")]
    if not raw:
        return ""
    ordered = sorted_chapter_summaries([dict(ch) for ch in raw])
    written = sum(1 for ch in ordered if chapter_has_substantial_body(ch))
    pending = len(ordered) - written
    lines = [
        CHAPTER_DB_CATALOG_NOTE,
        f"共 {len(ordered)} 章（已写 {written}，待写/空 {pending}）：",
    ]
    lines.extend(_chapter_catalog_line(ch) for ch in ordered)
    text = "\n".join(lines)
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 20] + "\n…（章表已截断）"


def _chapter_line_label(ch: dict[str, Any]) -> str:
    """Metadata for chapter_window — includes index + chapter_id."""
    from app.agent.harness.tool_contract import format_chapter_window_line

    return format_chapter_window_line(ch)


_CHAPTER_CREATE_TAIL_MAX = 1500


def previous_chapter_tail_for_create(
    ctx: AgentRunContext, *, max_chars: int = _CHAPTER_CREATE_TAIL_MAX
) -> str:
    """Short tail for continuity — use the latest written chapter in list, not editor-only ch1."""
    chapters = sorted(
        [ch for ch in (ctx.chapters or []) if isinstance(ch, dict) and ch.get("id")],
        key=_chapter_sort_key,
    )
    text = ""
    for ch in reversed(chapters):
        if not chapter_has_substantial_body(ch):
            continue
        text = str(ch.get("content") or "").strip()
        if not text:
            text = str(ch.get("summary") or "").strip()
        if text:
            break
    text = text.strip()
    if not text:
        return ""
    if len(text) <= max_chars:
        return text
    return text[-max_chars:]


def find_chapter_id_by_title(ctx: AgentRunContext, title: str) -> str | None:
    want = (title or "").strip()
    if not want:
        return None
    for ch in ctx.chapters or []:
        if not isinstance(ch, dict):
            continue
        if str(ch.get("title") or "").strip() == want:
            cid = str(ch.get("id") or "").strip()
            return cid or None
    return None


def apply_chapter_tool_patch_to_ctx(
    ctx: AgentRunContext, patch: dict[str, Any] | None
) -> AgentRunContext:
    """Merge chapter_create/update results into ctx so the next plan turn sees new bodies."""
    if not patch or not isinstance(patch, dict):
        return ctx

    chapters = [dict(ch) for ch in (ctx.chapters or []) if isinstance(ch, dict)]
    current_id = str(ctx.current_chapter_id or "").strip()
    chapter_text = ctx.chapter_text

    create = patch.get("chapter_create")
    if isinstance(create, dict):
        title = str(create.get("title") or "").strip()
        content = str(create.get("content") or "").strip()
        wc = len(content.replace("\n", "").replace(" ", "")) if content else 0
        matched = False
        for ch in chapters:
            if title and str(ch.get("title") or "").strip() == title:
                if content:
                    ch["content"] = content
                if wc:
                    ch["word_count"] = wc
                matched = True
                cid = str(ch.get("id") or "").strip()
                if cid:
                    current_id = cid
                    chapter_text = content or chapter_text
                break
        if not matched and title:
            chapters.append(
                {
                    "id": f"local:{title}",
                    "title": title,
                    "content": content,
                    "word_count": wc,
                    "sort_order": len(chapters) + 1,
                }
            )
            current_id = chapters[-1]["id"]
            if content:
                chapter_text = content

    delete = patch.get("chapter_delete")
    if isinstance(delete, dict):
        cid = str(delete.get("chapter_id") or delete.get("id") or "").strip()
        if cid:
            chapters = [ch for ch in chapters if str(ch.get("id") or "") != cid]
            if current_id == cid:
                current_id = ""
                chapter_text = ""

    update = patch.get("chapter_update")
    if isinstance(update, dict):
        cid = str(update.get("chapter_id") or update.get("id") or "").strip()
        content = str(update.get("content") or "").strip()
        if cid:
            for ch in chapters:
                if str(ch.get("id") or "") != cid:
                    continue
                if content:
                    ch["content"] = content
                    ch["word_count"] = len(content.replace("\n", "").replace(" ", ""))
                current_id = cid
                if content:
                    chapter_text = content
                break

    return ctx.model_copy(
        update={
            "chapters": chapters,
            "current_chapter_id": current_id or ctx.current_chapter_id,
            "chapter_text": chapter_text,
        }
    )


def format_chapter_window(ctx: AgentRunContext, *, radius: int = CHAPTER_WINDOW_RADIUS) -> str:
    chapters = [ch for ch in (ctx.chapters or []) if isinstance(ch, dict)]
    if not chapters:
        return ""

    sorted_chs = sorted(chapters, key=_chapter_sort_key)
    focus_id = latest_written_chapter_id(ctx)
    idx: int | None = None
    if focus_id:
        for i, ch in enumerate(sorted_chs):
            if str(ch.get("id") or "") == focus_id:
                idx = i
                break

    if idx is None:
        window = sorted_chs[-radius:] if len(sorted_chs) > radius else sorted_chs
        scope = f"下为最近 {len(window)} 章（全书共 {len(sorted_chs)} 章）"
    else:
        start = max(0, idx - radius)
        end = min(len(sorted_chs), idx + radius + 1)
        window = sorted_chs[start:end]
        scope = f"下为最近已写章前后各 {radius} 章（全书共 {len(sorted_chs)} 章）"

    lines = [CHAPTER_WINDOW_SCOPE_NOTE, scope + "："]
    for ch in window:
        lines.append(_chapter_line_label(ch))
    return "\n".join(lines)
