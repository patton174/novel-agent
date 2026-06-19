"""Per-tool UI excerpts (SSE only — model text stays in ToolCallResult.content)."""

from __future__ import annotations

import json
import re
from collections.abc import Callable
from typing import Any

from app.agent.backend.format import FILE_UNCHANGED_STUB
from app.agent.harness.tool_display import (
    format_chapter_read_excerpt,
    format_list_chapters_excerpt,
    format_list_json_excerpt,
    format_memory_read_excerpt,
    format_memory_tree_excerpt,
    resolve_delete_memory_label,
    strip_line_numbers,
)

UiExcerptFn = Callable[[str, dict[str, Any]], str]

_REGISTRY: dict[str, UiExcerptFn] | None = None


def _first_line(text: str, *, limit: int = 240) -> str:
    line = (text or "").strip().split("\n", 1)[0].strip()
    return line[:limit] + ("…" if len(line) > limit else "")


def generic_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    return _first_line(content)


def read_chapter_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    text = (content or "").strip()
    if not text:
        return "（空）"
    if FILE_UNCHANGED_STUB in text or "unchanged since last read" in text.lower():
        return "未变更（与上次读取相同）"
    head = format_chapter_read_excerpt(content, body_limit=120)
    body = strip_line_numbers(text)
    lines = [ln for ln in body.splitlines() if ln.strip()]
    n = len(lines)
    if head and head != "（空章节）" and "《" in head:
        suffix = f"（共 {n} 行）" if n else ""
        return f"{head}{suffix}" if suffix and suffix not in head else head
    return f"已读取 {n} 行" if n else "已读取章节"


def read_memory_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    text = (content or "").strip()
    if not text:
        return "（空）"
    head = format_memory_read_excerpt(content, limit=120)
    if head:
        return f"已查阅记忆：{head}"
    return _first_line(text)


def list_chapters_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    excerpt = format_list_chapters_excerpt(content, limit=200)
    return excerpt or "列举完成"


def list_memory_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    excerpt = format_list_json_excerpt(content, limit=200)
    return excerpt or "列举完成"


def get_memory_tree_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    excerpt = format_memory_tree_excerpt(content, limit=200)
    return excerpt or "记忆树已就绪"


def search_knowledge_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    text = strip_line_numbers(content or "")
    if not text.strip():
        return "未找到匹配"
    lines = [ln for ln in text.splitlines() if ln.strip()]
    n = len(lines)
    return "找到 1 处匹配" if n <= 1 else f"找到 {n} 处匹配"


def write_chapter_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    text = (content or "").strip()
    if not text:
        return ""
    if "stream" in text.lower() and "chapter body" in text.lower():
        return "章节正文生成中…"
    title = str(tool_input.get("title") or "").strip()
    if text.startswith(("已写入", "已更新", "Wrote", "Edited")):
        return _first_line(text)
    if title:
        return f"已写入章节：《{title}》"
    return _first_line(text) or "已写入章节"


def edit_chapter_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    text = (content or "").strip()
    if not text:
        return ""
    title = str(tool_input.get("title") or "").strip()
    if text.startswith(("已更新", "Edited")):
        return _first_line(text)
    if title:
        return f"已更新章节：{title}"
    return _first_line(text) or "已更新章节"


def create_memory_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    title = str(tool_input.get("title") or "").strip()
    if title:
        return f"已创建记忆：{title}"
    try:
        data = json.loads(content or "")
        if isinstance(data, dict) and data.get("title"):
            return f"已创建记忆：{data['title']}"
    except json.JSONDecodeError:
        pass
    return _first_line(content) or "已创建记忆"


def update_memory_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    title = _memory_title_from_update(content, tool_input)
    if title:
        return f"已更新记忆：{title}"
    return "已更新记忆属性"


def update_memory_content_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    title = _memory_title_from_update(content, tool_input)
    if title:
        return f"已更新记忆正文：{title}"
    return "已更新记忆正文"


def update_memory_meta_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    title = _memory_title_from_update(content, tool_input)
    if title:
        return f"已更新记忆元数据：{title}"
    return "已更新记忆元数据"


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
    text = (content or "").strip()
    if text and not text.lower().startswith("deleted"):
        return _first_line(text)
    title = str(tool_input.get("title") or "").strip()
    return f"已删除章节：{title}" if title else "已删除章节"


def delete_memory_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    title = str(tool_input.get("title") or "").strip()
    if title:
        return resolve_delete_memory_label(title=title)
    try:
        data = json.loads(content or "")
        if isinstance(data, dict):
            from_title = str(data.get("title") or "").strip()
            if from_title:
                return resolve_delete_memory_label(title=from_title)
            if data.get("ok") is True:
                mid = str(data.get("memory_id") or tool_input.get("memory_id") or "").strip()
                return resolve_delete_memory_label(memory_id=mid)
    except json.JSONDecodeError:
        pass
    text = (content or "").strip()
    if text and not text.startswith("{"):
        return _first_line(text)
    mid = str(tool_input.get("memory_id") or "").strip()
    if mid:
        return resolve_delete_memory_label(memory_id=mid)
    return resolve_delete_memory_label()


def todo_write_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = content, tool_input
    return ""


def ask_user_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    if "waiting" in (content or "").lower():
        return "等待你的回复…"
    return _first_line(content, limit=200)


def reorder_chapters_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    m = re.search(r"Reordered\s+(\d+)", content or "", re.I)
    if m:
        return f"已调整 {m.group(1)} 个章节顺序"
    return _first_line(content) or "章节顺序已更新"


def skill_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    m = re.search(r"Skill\s+(\S+)", content or "")
    return f"已调用技能：{m.group(1)}" if m else _first_line(content)


def agent_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    if "queued" in (content or "").lower():
        return "子任务已排队"
    return _first_line(content, limit=200)


def web_stub_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    return _first_line(content, limit=160)


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
