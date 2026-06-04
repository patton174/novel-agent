"""Compact agent context: chapter window, onboarding filter, memory summaries."""

from __future__ import annotations

import json
import re
from typing import Any

from app.agent_step.schemas import AgentRunContext

CHAPTER_WINDOW_RADIUS = 5
# List API only returns word_count — not body; treat as written when count is high enough.
CHAPTER_WRITTEN_WORD_MIN = 100

# --- Chapter info chain (window → list → read); keep wording in sync across surfaces ---
CHAPTER_WINDOW_SCOPE_NOTE = (
    "【省略版·章节概览】仅最近若干章的标题/列表位/字数（非全书、无 chapter_id、无正文）。"
    "全书章表与 UUID → 优先看 RUN_CONTEXT `chapter_catalog`（作品库 PostgreSQL）；"
    "或 Read `…/chapters/index.json`（同一数据源，非本机磁盘文件数）。"
)

CHAPTER_LIST_SCOPE_NOTE = (
    "【完整版·元数据】全书章节的 chapter_id / 标题 / 列表位 / 字数 / 是否已写（来自作品库，非本地 .md 文件个数）。"
    "正文 → Read `…/chapters/{chapter_id}.md`（按 id 从库拉取）。"
)

CHAPTER_DB_CATALOG_NOTE = (
    "【作品库章表】数据存 PostgreSQL（Content API），VFS 路径仅为访问入口，不是仓库里的真实文件。"
    "禁止用 Glob 匹配到的 .md 个数推断「有几章」；以本章表的字数/状态为准。"
)

CHAPTER_INFO_CHAIN_FOR_PROMPT = """## 作品库数据（API 优先，非本机文件树）
| 来源 | 说明 | 标识符 | 正文 |
|------|------|--------|------|
| RUN_CONTEXT `chapter_catalog` | **章节首选**：全书元数据（Content API） | chapter_id | 否 |
| RUN_CONTEXT `memory_catalog` | **记忆首选**：story-memory（Redis/PG） | scope/key | 否 |
| RUN_CONTEXT `chapter_window` | 最近若干章摘要 | 否 | 否 |
| Read `…/chapters/index.json` | 与 chapter_catalog 同源 | chapter_id | 否 |
| Read `…/chapters/{id}.md` | 单章正文 | id | 是 |
| Read `…/memory/{scope}/{key}.json` | 单条记忆（同源 API） | 路径 | 是 |
| Glob / Grep | **查询 API 库存量**，返回带 `# 数据来源：作品库 HTTP API` 头；行数≠磁盘文件数 |
盘点章节/记忆 → **先看 catalog**；勿用 Glob 行数当章数。Write/Edit 章节写入 Content API。"""
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
    """Full DB row for RUN_CONTEXT chapter_catalog (includes chapter_id)."""
    cid = str(ch.get("id") or "").strip()
    title = str(ch.get("title") or "未命名").strip()
    try:
        list_index = int(ch.get("list_index") or 0)
    except (TypeError, ValueError):
        list_index = 0
    try:
        wc = int(ch.get("word_count") or ch.get("wordCount") or 0)
    except (TypeError, ValueError):
        wc = 0
    status = "已写" if chapter_has_substantial_body(ch) else "待写/空"
    pos = f"列表第{list_index}章" if list_index > 0 else _chapter_sort_label(ch)
    return f"- id={cid} | {title} | {pos} | {wc}字 | {status}"


def format_chapter_catalog_db(ctx: AgentRunContext, *, max_chars: int = 6500) -> str:
    """全书章节元数据（Content API / ctx.chapters），供模型盘点进度。"""
    from app.agent_step.vfs.chapter_meta import sorted_chapter_summaries

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
    """Metadata only — no body, no chapter_id (use chapter_catalog for ids)."""
    title = str(ch.get("title") or "未命名").strip()
    sort_lbl = _chapter_sort_label(ch)
    try:
        list_index = int(ch.get("list_index") or 0)
    except (TypeError, ValueError):
        list_index = 0
    list_lbl = f"列表第{list_index}章" if list_index > 0 else ""
    try:
        wc = int(ch.get("word_count") or ch.get("wordCount") or 0)
    except (TypeError, ValueError):
        wc = 0
    meta = "，".join(x for x in (list_lbl, sort_lbl) if x)
    if chapter_has_substantial_body(ch):
        wc_part = f"，约{wc}字" if wc else ""
        return f"- {title}（{meta}{wc_part}）" if meta else f"- {title}（{sort_lbl}{wc_part}）"
    return f"- {title}（{meta}，待写/占位）" if meta else f"- {title}（{sort_lbl}，待写/占位）"


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


def _character_one_liner(name: str, attrs: dict[str, Any]) -> str:
    card_raw = str(attrs.get("人物卡") or "").strip()
    identity = ""
    personality = ""
    if card_raw.startswith("{"):
        try:
            parsed = json.loads(card_raw)
            if isinstance(parsed, dict):
                identity = str(parsed.get("身份") or "").strip()
                personality = str(parsed.get("性格") or "").strip()[:40]
        except json.JSONDecodeError:
            pass
    if not identity:
        identity = str(attrs.get("身份") or "").strip()
    ability = str(attrs.get("能力体系") or "").strip()[:_CHARACTER_PREVIEW_MAX]
    bits = [b for b in (identity, personality, ability) if b]
    if bits:
        return f"- {name}: {' · '.join(bits[:2])}"
    return f"- {name}"


def render_story_memory_compact_from_snapshot(
    snapshot: dict[str, Any],
    *,
    max_len: int = 900,
    character_first: bool = False,
) -> str:
    lines: list[str] = []

    def _emit_section(title: str, rows: dict[str, Any]) -> None:
        if not rows:
            return
        lines.append(f"{title}:")
        for k, v in list(rows.items())[:10]:
            lines.append(f"- {k}: {str(v)[:_WORLD_VALUE_MAX]}")

    chars = snapshot.get("characters") if isinstance(snapshot.get("characters"), dict) else {}
    if character_first and chars:
        lines.append("角色库:")
        for name, attrs in list(chars.items())[:24]:
            if isinstance(attrs, dict):
                lines.append(_character_one_liner(str(name), attrs))
            else:
                lines.append(f"- {name}")

    for section, title in (
        ("novel", "小说信息"),
        ("world", "世界观"),
        ("background", "背景"),
    ):
        rows = snapshot.get(section) if isinstance(snapshot.get(section), dict) else {}
        _emit_section(title, rows)

    if chars and not character_first:
        lines.append("角色库:")
        for name, attrs in list(chars.items())[:24]:
            if isinstance(attrs, dict):
                lines.append(_character_one_liner(str(name), attrs))
            else:
                lines.append(f"- {name}")

    text = "\n".join(lines).strip()
    if len(text) > max_len:
        return text[:max_len] + "…"
    return text


def compact_story_memory_text(raw: str, *, max_len: int = 900) -> str:
    """Best-effort compacting when only rendered text is available."""
    text = (raw or "").strip()
    if not text:
        return ""
    if len(text) <= max_len and "人物卡:" not in text and '"身份"' not in text:
        return text

    lines: list[str] = []
    current_name: str | None = None
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("人物塑造:") or stripped.startswith("角色库:"):
            lines.append("角色库:")
            continue
        if stripped.startswith("- ") and not stripped.startswith("- 人物卡"):
            m = re.match(r"^- ([^:]+):\s*$", stripped)
            if m:
                current_name = m.group(1).strip()
                continue
            if current_name and ("人物卡" in stripped or '"身份"' in stripped):
                identity = ""
                if '"身份"' in stripped:
                    im = re.search(r'"身份"\s*:\s*"([^"]{1,80})"', stripped)
                    if im:
                        identity = im.group(1)
                lines.append(f"- {current_name}: {identity or '（详见 memory_read）'}")
                current_name = None
                continue
        if stripped.endswith(":") and not stripped.startswith("- "):
            lines.append(stripped)
            continue
        if stripped.startswith("- ") and "人物卡" not in stripped:
            key_val = stripped[2:]
            if len(key_val) > _WORLD_VALUE_MAX + 20:
                key, _, val = key_val.partition(": ")
                lines.append(f"- {key}: {val[:_WORLD_VALUE_MAX]}")
            else:
                lines.append(stripped)

    compact = "\n".join(lines).strip() or text[:max_len]
    if len(compact) > max_len:
        return compact[:max_len] + "…"
    return compact
