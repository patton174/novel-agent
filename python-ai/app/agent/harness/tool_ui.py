"""Per-tool UI excerpts (SSE only — model text stays in ToolCallResult.content)."""

from __future__ import annotations

import json
import re
from collections.abc import Callable
from typing import Any

from app.agent.backend.format import FILE_UNCHANGED_STUB
from app.agent.harness.tool_display import (
    format_chapter_title_only,
    format_list_chapters_excerpt,
    format_list_json_excerpt,
    format_memory_read_excerpt,
    format_memory_tree_excerpt,
    strip_line_numbers,
)

UiExcerptFn = Callable[[str, dict[str, Any]], str]

_REGISTRY: dict[str, UiExcerptFn] | None = None


def _first_line(text: str, *, limit: int = 240) -> str:
    line = (text or "").strip().split("\n", 1)[0].strip()
    return line[:limit] + ("…" if len(line) > limit else "")


def _format_title_label(title: str) -> str:
    t = (title or "").strip()
    if not t:
        return ""
    if t.startswith("《") and t.endswith("》"):
        return t
    return f"《{t}》"


def generic_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    return _first_line(content)


def read_chapter_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    text = (content or "").strip()
    if not text:
        return "（空）"
    if FILE_UNCHANGED_STUB in text or "unchanged since last read" in text.lower():
        title = format_chapter_title_only(content)
        return title or "未变更"
    title = format_chapter_title_only(content)
    return title or "（空）"


def read_memory_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    text = (content or "").strip()
    if not text:
        return "（空）"
    head = format_memory_read_excerpt(content, limit=96)
    return head or "（空）"


def list_chapters_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    excerpt = format_list_chapters_excerpt(content, limit=200)
    return excerpt or "（空）"


def list_memory_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    excerpt = format_list_json_excerpt(content, limit=200)
    return excerpt or "（空）"


def get_memory_tree_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    excerpt = format_memory_tree_excerpt(content, limit=200)
    return excerpt or "（空）"


def search_knowledge_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    text = strip_line_numbers(content or "")
    if not text.strip():
        return "（无匹配）"
    lines = [ln for ln in text.splitlines() if ln.strip()]
    if not lines:
        return "（无匹配）"
    first = lines[0].lstrip("-* ").split(":", 1)[0].split("：", 1)[0].strip()
    if first:
        return first[:96] + ("…" if len(first) > 96 else "")
    return f"{len(lines)} 处"


def write_chapter_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    title = str(tool_input.get("title") or "").strip()
    if title:
        return _format_title_label(title)
    text = (content or "").strip()
    if "stream" in text.lower() and "chapter body" in text.lower():
        return ""
    parsed = format_chapter_title_only(content)
    if parsed:
        return parsed
    return _first_line(text, limit=96)


def edit_chapter_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    title = str(tool_input.get("title") or "").strip()
    if title:
        return _format_title_label(title)
    parsed = format_chapter_title_only(content)
    if parsed:
        return parsed
    return _first_line(content, limit=96)


def create_memory_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    title = str(tool_input.get("title") or "").strip()
    if title:
        return title
    try:
        data = json.loads(content or "")
        if isinstance(data, dict) and data.get("title"):
            return str(data["title"]).strip()
    except json.JSONDecodeError:
        pass
    return _first_line(content, limit=96)


def update_memory_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    title = _memory_title_from_update(content, tool_input)
    return title or ""


def update_memory_content_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    return update_memory_ui_excerpt(content, tool_input)


def update_memory_meta_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    return update_memory_ui_excerpt(content, tool_input)


def _memory_title_from_update(content: str, tool_input: dict[str, Any]) -> str:
    title = str(tool_input.get("title") or "").strip()
    if title:
        return title
    try:
        data = json.loads(content or "")
        if isinstance(data, dict):
            return str(data.get("title") or "").strip()
    except json.JSONDecodeError:
        pass
    return ""


def delete_chapter_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    title = str(tool_input.get("title") or "").strip()
    if title:
        return _format_title_label(title)
    parsed = format_chapter_title_only(content)
    if parsed:
        return parsed
    text = (content or "").strip()
    if text and not text.lower().startswith("deleted"):
        return _first_line(text, limit=96)
    return ""


def delete_memory_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    title = str(tool_input.get("title") or "").strip()
    if title:
        return title
    try:
        data = json.loads(content or "")
        if isinstance(data, dict):
            from_title = str(data.get("title") or "").strip()
            if from_title:
                return from_title
    except json.JSONDecodeError:
        pass
    text = (content or "").strip()
    if text and not text.startswith("{"):
        return _first_line(text, limit=96)
    return ""


def todo_write_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = content, tool_input
    return ""


def ask_user_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    if "waiting" in (content or "").lower():
        return ""
    return _first_line(content, limit=96)


def reorder_chapters_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    m = re.search(r"Reordered\s+(\d+)", content or "", re.I)
    if m:
        return f"{m.group(1)} 章"
    return _first_line(content, limit=96)


def skill_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    m = re.search(r"Skill\s+(\S+)", content or "")
    return m.group(1) if m else _first_line(content, limit=96)


def agent_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    return _first_line(content, limit=96)


def web_stub_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    return _first_line(content, limit=96)


def resolve_tool_ui_excerpt(
    tool: str,
    content: str,
    tool_input: dict[str, Any] | None = None,
) -> str | None:
    from app.agent.tools.registry import find_tool_by_name

    inp = dict(tool_input or {})
    reg = find_tool_by_name(tool)
    if reg is not None and reg.ui_excerpt is not None:
        return reg.ui_excerpt(content, inp)
    fn = default_ui_excerpt_for_name(tool)
    if fn is not None:
        return fn(content, inp)
    return None


def default_ui_excerpt_registry() -> dict[str, UiExcerptFn]:
    return {
        "ReadChapter": read_chapter_ui_excerpt,
        "ReadMemory": read_memory_ui_excerpt,
        "ListChapters": list_chapters_ui_excerpt,
        "ListMemory": list_memory_ui_excerpt,
        "GetMemoryTree": get_memory_tree_ui_excerpt,
        "SearchKnowledge": search_knowledge_ui_excerpt,
        "WriteChapter": write_chapter_ui_excerpt,
        "EditChapter": edit_chapter_ui_excerpt,
        "CreateMemory": create_memory_ui_excerpt,
        "UpdateMemoryFields": update_memory_ui_excerpt,
        "UpdateMemoryContent": update_memory_content_ui_excerpt,
        "UpdateMemoryMeta": update_memory_meta_ui_excerpt,
        "MoveMemory": update_memory_ui_excerpt,
        "DeleteChapter": delete_chapter_ui_excerpt,
        "DeleteMemory": delete_memory_ui_excerpt,
        "TodoWrite": todo_write_ui_excerpt,
        "AskUser": ask_user_ui_excerpt,
        "ReorderChapters": reorder_chapters_ui_excerpt,
        "Skill": skill_ui_excerpt,
        "Agent": agent_ui_excerpt,
        "WebFetch": web_stub_ui_excerpt,
        "WebSearch": web_stub_ui_excerpt,
        "ListMcpResources": generic_ui_excerpt,
        "ReadMcpResource": generic_ui_excerpt,
        "CallMcpTool": generic_ui_excerpt,
    }


def default_ui_excerpt_for_name(tool: str) -> UiExcerptFn | None:
    global _REGISTRY
    if _REGISTRY is None:
        _REGISTRY = default_ui_excerpt_registry()
    key = (tool or "").strip()
    return _REGISTRY.get(key) if key else None
