"""User-facing tool result excerpts (SSE / UI only).

Model-facing text: step.completed display.content (see tool_result_routing).
"""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import unquote

from app.agent.harness.cc_visibility import (
    is_chapter_vfs_path,
    is_memory_vfs_path,
    normalize_tool_name,
)
from app.agent.schemas import AgentRunContext
from app.agent.backend.ids import CHAPTER_ID_RE as VFS_CHAPTER_ID_RE
from app.agent.backend import chapter_store
from app.agent.backend.chapter_meta import (
    format_chapter_display_label,
    sorted_chapter_summaries,
)

_MEMORY_SCOPE_LABELS: dict[str, str] = {
    "characters": "角色库",
    "character": "角色库",
    "world": "世界观",
    "worldview": "世界观",
    "background": "背景设定",
    "novel": "作品设定",
    "chapter": "章节记忆",
    "chapters": "章节记忆",
    "story": "故事记忆",
    "plot": "情节记忆",
    "style": "文风",
    "outline": "大纲",
}

_LINE_NUM_RE = re.compile(r"^\s*\d+\t(.*)$")
_CHAPTER_ID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.I,
)
_META_KEYS = frozenset(
    {"title", "chapter_id", "list_index", "sort_order", "session_id", "novel_id"}
)
_INVENTORY_HEADER_RE = re.compile(
    r"^#\s*(数据来源|章节（|记忆（|禁止用)"
)


def strip_line_numbers(text: str) -> str:
    out: list[str] = []
    for line in (text or "").splitlines():
        m = _LINE_NUM_RE.match(line)
        out.append(m.group(1) if m else line)
    return "\n".join(out)


def split_frontmatter(text: str) -> tuple[dict[str, str], str]:
    """Parse optional --- yaml --- block (chapter Read)."""
    raw = strip_line_numbers(text).strip()
    if not raw.startswith("---"):
        return {}, raw
    parts = raw.split("---", 2)
    if len(parts) < 3:
        return {}, raw
    meta: dict[str, str] = {}
    for line in parts[1].splitlines():
        if ":" not in line:
            continue
        key, val = line.split(":", 1)
        key = key.strip().lower()
        if key in _META_KEYS:
            meta[key] = val.strip()
    body = parts[2].strip()
    body = re.sub(r"^<!--\s*summary:.*?-->\s*", "", body, flags=re.DOTALL).strip()
    return meta, body


def _truncate(text: str, limit: int = 220) -> str:
    t = re.sub(r"\s+", " ", (text or "").strip())
    if len(t) <= limit:
        return t
    return t[: limit - 1].rstrip() + "…"


def format_chapter_read_excerpt(content: str, *, body_limit: int = 220) -> str:
    meta, body = split_frontmatter(content)
    title = meta.get("title") or ""
    lines: list[str] = []
    if title:
        lines.append(f"《{title}》")
    snippet = _truncate(body.replace("\n", " "), body_limit)
    if snippet:
        lines.append(snippet)
    return "\n".join(lines) if lines else "（空章节）"


def format_memory_read_excerpt(content: str, *, limit: int = 220, body_limit: int | None = None) -> str:
    if body_limit is not None:
        limit = body_limit
    text = strip_line_numbers(content).strip()
    if not text:
        return ""
    if "---" in text:
        body = text.split("---", 1)[-1].strip()
        if body:
            return _truncate(body.replace("\n", " "), limit)
    first = text.split("\n", 1)[0].strip()
    if first.startswith(("-", "*")):
        first = first.lstrip("-* ").split(":", 1)[0].split("：", 1)[0].strip()
    return _truncate(first or text, limit)


def strip_inventory_headers_for_ui(content: str) -> str:
    """Strip VFS inventory headers; keep tree/path lines for frontend rendering."""
    text = strip_line_numbers(content)
    kept: list[str] = []
    for line in text.splitlines():
        s = line.strip()
        if not s or _INVENTORY_HEADER_RE.match(s):
            continue
        kept.append(s)
    return "\n".join(kept) if kept else "（无匹配）"


def format_list_chapters_excerpt(content: str, *, limit: int = 280) -> str:
    import json

    try:
        data = json.loads(content)
        chs = data.get("chapters") if isinstance(data, dict) else None
        if isinstance(chs, list) and chs:
            titles = [
                str(ch.get("title") or ch.get("chapter_id") or "").strip()
                for ch in chs
                if isinstance(ch, dict)
            ]
            titles = [t for t in titles if t]
            if titles:
                head = titles[:6]
                out = "、".join(head)
                more = len(titles) - len(head)
                if more > 0:
                    out += f" 等 {len(titles)} 章"
                return _truncate(out, limit)
    except (json.JSONDecodeError, TypeError):
        pass
    return format_glob_grep_excerpt(content, limit=limit)


def format_glob_grep_excerpt(content: str, *, limit: int = 280) -> str:
    text = strip_line_numbers(content)
    kept: list[str] = []
    for line in text.splitlines():
        s = line.strip()
        if not s or _INVENTORY_HEADER_RE.match(s):
            continue
        if s.startswith("#"):
            kept.append(s.lstrip("#").strip())
            continue
        if "/chapters/" in s and s.endswith(".md"):
            name = s.split("/chapters/")[-1].replace(".md", "")
            if _CHAPTER_ID_RE.match(name):
                kept.append("章节条目")
            else:
                kept.append(f"章节·{name}")
            continue
        if "/memory/" in s:
            kept.append(s.split("/memory/")[-1].replace(".json", ""))
            continue
        kept.append(s)
    if not kept:
        return "（无匹配）"
    head = kept[:6]
    more = len(kept) - len(head)
    out = "、".join(head)
    if more > 0:
        out += f" 等 {len(kept)} 项"
    return _truncate(out, limit)


def format_tool_display_excerpt(
    tool: str,
    content: str,
    file_path: str = "",
    *,
    body_limit: int = 220,
    tool_input: dict[str, Any] | None = None,
) -> str:
    """Short human excerpt for SSE / frontend (CC ``renderToolResultMessage``)."""
    if not (content or "").strip():
        return ""
    inp = dict(tool_input or {})
    if file_path:
        inp.setdefault("file_path", file_path)
    from app.agent.harness.tool_ui import resolve_tool_ui_excerpt

    custom = resolve_tool_ui_excerpt(tool, content, inp)
    if custom is not None:
        return custom.strip()
    raw = (tool or "").strip()
    path = file_path or ""

    if raw in ("ReadChapter", "ReadMemory"):
        if raw == "ReadChapter" or (path and is_chapter_vfs_path(path)):
            return format_chapter_read_excerpt(content, body_limit=body_limit)
        return format_memory_read_excerpt(content, body_limit=body_limit)

    if raw == "ListChapters":
        return format_list_chapters_excerpt(content, limit=280)
    if raw in ("ListMemory", "SearchKnowledge"):
        return format_glob_grep_excerpt(content, limit=280)

    if raw in ("WriteChapter", "EditChapter", "WriteMemory", "EditMemory"):
        text = content.strip()
        if text and not text.lower().startswith(("wrote", "edited")):
            return _truncate(text.split("\n", 1)[0], 120)
        if path and (is_chapter_vfs_path(path) or is_memory_vfs_path(path)):
            return format_write_success_message(
                "edit" if raw in ("EditChapter", "EditMemory") else "write", "", path
            )

    if raw in ("DeleteChapter", "DeleteMemory"):
        text = content.strip()
        if text and not text.lower().startswith("deleted"):
            return _truncate(text, 120)
        if path:
            return format_delete_display_message(path)
        return "已删除"

    return _truncate(strip_line_numbers(content).replace("\n", " "), body_limit)


def _chapter_id_from_vfs_path(file_path: str) -> str:
    path = (file_path or "").replace("\\", "/")
    if "/chapters/" not in path:
        return ""
    tail = path.split("/chapters/")[-1].replace(".md", "").strip()
    return tail if VFS_CHAPTER_ID_RE.match(tail) else ""


async def resolve_delete_target_label(
    ctx: AgentRunContext,
    file_path: str,
) -> str:
    """Human label for what was deleted (title / memory name, no .md path or uuid)."""
    cid = _chapter_id_from_vfs_path(file_path)
    if cid:
        title = ""
        list_index = 0
        sort_order = 0
        ordered = sorted_chapter_summaries(
            [dict(ch) for ch in (ctx.chapters or []) if isinstance(ch, dict)]
        )
        for ch in ordered:
            if str(ch.get("id") or "") == cid:
                title = str(ch.get("title") or "").strip()
                list_index = int(ch.get("list_index") or 0)
                sort_order = int(ch.get("sort_order") or 0)
                break
        if not title:
            full = await chapter_store.fetch_chapter_full(ctx, cid)
            if isinstance(full, dict):
                title = str(full.get("title") or "").strip()
                sort_order = int(full.get("sort_order") or 0)
                list_index = int(full.get("list_index") or 0)
        label = format_chapter_display_label(
            title or "章节",
            list_index=list_index,
            sort_order=sort_order,
        )
        return f"已从作品库删除章节：{label}"

    path = (file_path or "").replace("\\", "/")
    m = re.search(r"/memory/([^/]+)/([^/]+?)(?:\.json)?$", path, re.I)
    if m:
        scope = _MEMORY_SCOPE_LABELS.get(m.group(1).lower(), f"记忆·{m.group(1)}")
        key = unquote(m.group(2))
        if key and not VFS_CHAPTER_ID_RE.match(key):
            return f"已删除创作记忆：{scope} · {key}"
        return f"已删除创作记忆：{scope}"

    return "已删除"


def format_delete_display_message(file_path: str) -> str:
    """Sync fallback when ctx unavailable (SSE replay)."""
    path = (file_path or "").replace("\\", "/")
    if "/chapters/" in path:
        return "已从作品库删除章节（作品库）"
    if "/memory/" in path:
        m = re.search(r"/memory/([^/]+)/([^/]+?)(?:\.json)?$", path, re.I)
        if m:
            scope = _MEMORY_SCOPE_LABELS.get(m.group(1).lower(), m.group(1))
            key = unquote(m.group(2))
            if key and not VFS_CHAPTER_ID_RE.match(key):
                return f"已删除创作记忆：{scope} · {key}"
            return f"已删除创作记忆：{scope}"
        return "已删除创作记忆"
    return "已删除"


def memory_scope_and_entry_from_path(file_path: str) -> tuple[str, str]:
    """(scope label, entry key/title segment) from VFS /memory/… path."""
    path = (file_path or "").replace("\\", "/")
    m = re.search(r"/memory/([^/]+)/([^/]+?)(?:\.json)?$", path, re.I)
    if not m:
        return "创作记忆", ""
    scope = _MEMORY_SCOPE_LABELS.get(m.group(1).lower(), f"记忆·{m.group(1)}")
    entry = unquote(m.group(2))
    if _CHAPTER_ID_RE.match(entry):
        return scope, ""
    return scope, entry


def format_memory_mutation_message(
    kind: str,
    file_path: str,
    envelope_title: str = "",
) -> str:
    """User-facing Write/Edit on story-memory VFS paths."""
    scope_label, entry = memory_scope_and_entry_from_path(file_path)
    title = (envelope_title or "").strip() or entry
    verb = {"write": "已写入", "edit": "已更新", "delete": "已删除"}.get(kind, "已更新")
    if title:
        return f"{verb}创作记忆：{scope_label} · {title}"
    return f"{verb}创作记忆：{scope_label}"


def format_write_success_message(
    kind: str,
    display_label: str,
    file_path: str = "",
) -> str:
    """User-facing Write/Edit result (no Edited/Wrote English)."""
    if file_path and is_memory_vfs_path(file_path):
        return format_memory_mutation_message(kind, file_path, display_label)
    label = (display_label or "").strip()
    if label:
        if kind == "edit":
            return f"已更新章节：{label}"
        return f"已写入章节：{label}"
    if file_path and is_chapter_vfs_path(file_path):
        return "已更新章节" if kind == "edit" else "已写入章节"
    return "已更新" if kind == "edit" else "已写入"


def chapter_label_for_vfs_path(file_path: str, ctx: AgentRunContext | None) -> str:
    """Resolve 《标题》（作品列表第 n 章） from VFS path + run context chapters."""
    if not file_path or not ctx:
        return ""
    cid = _chapter_id_from_vfs_path(file_path)
    if not cid:
        return ""
    ordered = sorted_chapter_summaries(
        [dict(ch) for ch in (ctx.chapters or []) if isinstance(ch, dict)]
    )
    for ch in ordered:
        if str(ch.get("id") or "") == cid:
            title = str(ch.get("title") or "").strip() or "章节"
            list_index = int(ch.get("list_index") or 0)
            sort_order = int(ch.get("sort_order") or 0)
            return format_chapter_display_label(
                title,
                list_index=list_index,
                sort_order=sort_order,
            )
    return ""


def chapter_write_progress_message(
    tool: str,
    tool_input: dict[str, Any] | None,
    ctx: AgentRunContext,
) -> str:
    from app.agent.harness.cc_visibility import vfs_path_from_tool_input

    raw = (tool or "").strip()
    inp = dict(tool_input or {})
    verb = "编辑" if raw == "EditChapter" else "写入"
    if raw in ("WriteChapter", "EditChapter"):
        title = str(inp.get("title") or "").strip()
        if title:
            return f"正在{verb}《{title}》…"
        return f"正在{verb}章节正文…"
    fp = vfs_path_from_tool_input(tool_input)
    if fp and is_chapter_vfs_path(fp):
        label = chapter_label_for_vfs_path(fp, ctx)
        if label:
            return f"正在{verb}{label}…"
    return f"正在{tool_display_name(tool, tool_input)}…"


def read_progress_message(tool: str, tool_input: dict[str, Any] | None) -> str:
    from app.agent.harness.cc_visibility import tool_display_name, vfs_path_from_tool_input

    fp = vfs_path_from_tool_input(tool_input)
    label = tool_display_name(tool, tool_input)
    if fp and is_chapter_vfs_path(fp):
        return f"正在从作品库读取章节…"
    if fp and is_memory_vfs_path(fp):
        return "正在查阅创作记忆…"
    raw = (tool or "").strip()
    if raw == "ListChapters":
        return "正在列举章节…"
    if raw == "ListMemory":
        return "正在列举创作记忆…"
    if raw == "SearchKnowledge":
        return "正在检索知识库…"
    return f"正在{label}…"
