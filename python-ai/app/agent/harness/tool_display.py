"""User-facing tool result excerpts (SSE / UI only).

Model-facing text: step.completed display.content (see tool_result_routing).
"""

from __future__ import annotations

import json
import re
from typing import Any

from app.agent.backend import chapter_store
from app.agent.backend.chapter_meta import (
    format_chapter_display_label,
    sorted_chapter_summaries,
)
from app.agent.harness.cc_visibility import tool_display_name
from app.agent.schemas import AgentRunContext

_LINE_NUM_RE = re.compile(r"^\s*\d+\t(.*)$")
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


_LIST_PREVIEW_MAX = 3


def _format_title_label(title: str) -> str:
    t = (title or "").strip()
    if not t:
        return ""
    if t.startswith("《") and t.endswith("》"):
        return t
    return f"《{t}》"


def _join_preview_items(titles: list[str], *, limit: int = _LIST_PREVIEW_MAX) -> str:
    cleaned = [t.strip() for t in titles if t and t.strip()]
    if not cleaned:
        return ""
    head = cleaned[:limit]
    out = "、".join(head)
    if len(cleaned) > limit:
        out += "…"
    return out


def format_chapter_title_only(content: str) -> str:
    meta, _ = split_frontmatter(content)
    return _format_title_label(meta.get("title") or "")


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
    if text.startswith("# "):
        return _truncate(text.split("\n", 1)[0].lstrip("# ").strip(), limit)
    if "---" in text:
        body = text.split("---", 1)[-1].strip()
        if body:
            return _truncate(body.replace("\n", " "), limit)
    first = text.split("\n", 1)[0].strip()
    if first.startswith(("-", "*")):
        first = first.lstrip("-* ").split(":", 1)[0].split("：", 1)[0].strip()
    return _truncate(first or text, limit)


def format_list_chapters_excerpt(content: str, *, limit: int = 280) -> str:
    try:
        data = json.loads(content)
        if isinstance(data, dict):
            chs = data.get("chapters")
            if isinstance(chs, list):
                if not chs:
                    return "暂无章节"
                titles = [
                    str(ch.get("title") or ch.get("chapter_id") or "").strip()
                    for ch in chs
                    if isinstance(ch, dict)
                ]
                titles = [t for t in titles if t]
                if titles:
                    out = _join_preview_items(titles)
                    return _truncate(out, limit) if out else "暂无章节"
                return "暂无章节"
    except (json.JSONDecodeError, TypeError):
        pass
    return format_list_json_excerpt(content, limit=limit)


def format_list_json_excerpt(content: str, *, limit: int = 280) -> str:
    try:
        data = json.loads(content)
        if isinstance(data, dict):
            entries = data.get("entries")
            if isinstance(entries, list) and entries:
                titles = [
                    str(row.get("title") or row.get("memory_id") or "").strip()
                    for row in entries
                    if isinstance(row, dict)
                ]
                titles = [t for t in titles if t]
                if titles:
                    out = _join_preview_items(titles)
                    return _truncate(out, limit) if out else "暂无记忆项"
                return "暂无记忆项"
            if isinstance(entries, list) and not entries:
                return "暂无记忆项"
    except (json.JSONDecodeError, TypeError):
        pass
    text = strip_line_numbers(content)
    kept = [
        ln.strip()
        for ln in text.splitlines()
        if ln.strip() and not _INVENTORY_HEADER_RE.match(ln.strip())
    ]
    if not kept:
        return "（无匹配）"
    return _truncate("、".join(kept[:_LIST_PREVIEW_MAX]) + ("…" if len(kept) > _LIST_PREVIEW_MAX else ""), limit)


def _memory_tree_node_titles(nodes: list[Any], *, limit: int = _LIST_PREVIEW_MAX) -> list[str]:
    titles: list[str] = []
    for row in nodes:
        if not isinstance(row, dict):
            continue
        title = str(row.get("title") or "").strip()
        if title:
            titles.append(title)
        if len(titles) >= limit:
            break
    return titles


def format_memory_tree_excerpt(content: str, *, limit: int = 220) -> str:
    """Human summary for GetMemoryTree JSON ({scope, count, nodes})."""
    try:
        data = json.loads(content or "")
    except (json.JSONDecodeError, TypeError):
        return _truncate(strip_line_numbers(content).replace("\n", " "), limit)

    if not isinstance(data, dict):
        return _truncate(strip_line_numbers(content).replace("\n", " "), limit)

    scope = str(data.get("scope") or "").strip()
    nodes = data.get("nodes") if isinstance(data.get("nodes"), list) else []
    count = int(data.get("count") or len(nodes) or 0)
    titles = _memory_tree_node_titles(nodes)

    if titles:
        return _truncate(_join_preview_items(titles), limit)

    if scope:
        if count <= 0:
            return f"{scope}（空）"
        return f"{count} 项"

    if count <= 0:
        return "（无节点）"
    return f"{count} 项"


def format_tool_display_excerpt(
    tool: str,
    content: str,
    file_path: str = "",
    *,
    body_limit: int = 220,
    tool_input: dict[str, Any] | None = None,
) -> str:
    """Short human excerpt for SSE / frontend."""
    if not (content or "").strip():
        return ""
    inp = dict(tool_input or {})
    if file_path:
        inp.setdefault("file_path", file_path)
    from app.agent.harness.tool_ui import resolve_tool_ui_excerpt

    custom = resolve_tool_ui_excerpt(tool, content, inp)
    if custom is not None:
        return custom.strip()
    return _truncate(strip_line_numbers(content).replace("\n", " "), body_limit)


async def resolve_delete_chapter_label(ctx: AgentRunContext, chapter_id: str) -> str:
    cid = (chapter_id or "").strip()
    if not cid:
        return "已删除章节"
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
    label = format_chapter_display_label(title or "章节", list_index=list_index, sort_order=sort_order)
    return f"已从作品库删除章节：{label}"


def resolve_delete_memory_label(*, title: str = "", memory_id: str = "") -> str:
    name = (title or "").strip()
    if name:
        return f"已删除记忆：{name}"
    mid = (memory_id or "").strip()
    if mid:
        return f"已删除记忆 {mid[:8]}…"
    return "已删除记忆"


def chapter_write_progress_message(
    tool: str,
    tool_input: dict[str, Any] | None,
    ctx: AgentRunContext,
) -> str:
    _ = ctx
    raw = (tool or "").strip()
    inp = dict(tool_input or {})
    verb = "编辑" if raw == "EditChapter" else "写入"
    if raw in ("WriteChapter", "EditChapter"):
        title = str(inp.get("title") or "").strip()
        if title:
            return f"正在{verb}《{title}》…"
        cid = str(inp.get("chapter_id") or "").strip()
        if cid:
            return f"正在{verb}章节 {cid[:8]}…"
        return f"正在{verb}章节正文…"
    return f"正在{tool_display_name(tool, tool_input)}…"


def memory_mutation_progress_message(tool: str, tool_input: dict[str, Any] | None) -> str:
    raw = (tool or "").strip()
    inp = dict(tool_input or {})
    if raw == "CreateMemory":
        title = str(inp.get("title") or "").strip()
        return f"正在创建记忆「{title}」…" if title else "正在创建记忆…"
    if raw in ("UpdateMemoryFields", "UpdateMemoryContent", "UpdateMemoryMeta"):
        mid = str(inp.get("memory_id") or "").strip()
        return f"正在更新记忆 {mid[:8]}…" if mid else "正在更新记忆…"
    if raw == "MoveMemory":
        return "正在移动记忆节点…"
    if raw == "DeleteMemory":
        mid = str(inp.get("memory_id") or "").strip()
        return f"正在删除记忆 {mid[:8]}…" if mid else "正在删除记忆…"
    return f"正在{tool_display_name(tool, tool_input)}…"


def read_progress_message(tool: str, tool_input: dict[str, Any] | None) -> str:
    raw = (tool or "").strip()
    if raw == "ReadChapter":
        return "正在阅读章节…"
    if raw == "ReadMemory":
        return "正在查阅记忆…"
    if raw == "ListChapters":
        return "正在列举章节…"
    if raw == "ListMemory":
        return "正在列举记忆…"
    if raw == "GetMemoryTree":
        return "正在加载记忆树…"
    if raw == "SearchKnowledge":
        return "正在检索知识库…"
    if raw == "SearchSessionHistory":
        return "正在检索会话历史…"
    return f"正在{tool_display_name(tool, tool_input)}…"
