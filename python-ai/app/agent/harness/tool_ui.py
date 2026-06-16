"""Per-tool UI excerpts (CC ``renderToolResultMessage`` flattened for SSE).

Model text stays in ``ToolCallResult.content`` / ``map_tool_result_for_model``.
"""

from __future__ import annotations

import json
import re
from collections.abc import Callable
from typing import Any

from app.agent.backend.format import FILE_UNCHANGED_STUB
from app.agent.harness.cc_visibility import (
    is_chapter_vfs_path,
    is_memory_vfs_path,
    normalize_tool_name,
    vfs_path_from_tool_input,
)
from app.agent.harness.tool_display import (
    format_chapter_read_excerpt,
    format_delete_display_message,
    format_glob_grep_excerpt,
    format_memory_mutation_message,
    format_memory_read_excerpt,
    format_write_success_message,
    strip_line_numbers,
)

UiExcerptFn = Callable[[str, dict[str, Any]], str]

_INVENTORY_CHAPTER_RE = re.compile(r"#\s*章节[^:]*:\s*(\d+)")
_INVENTORY_MEMORY_RE = re.compile(r"#\s*记忆[^:]*:\s*(\d+)")
_REGISTRY: dict[str, UiExcerptFn] | None = None


def _file_path(tool_input: dict[str, Any]) -> str:
    return vfs_path_from_tool_input(tool_input) or str(tool_input.get("file_path") or "")


def _first_line(text: str, *, limit: int = 240) -> str:
    line = (text or "").strip().split("\n", 1)[0].strip()
    return line[:limit] + ("…" if len(line) > limit else "")


def generic_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    return _first_line(content)


def read_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    """CC FileReadTool UI: line count or unchanged stub (not numbered body)."""
    text = (content or "").strip()
    if not text:
        return "（空）"
    if FILE_UNCHANGED_STUB in text or "unchanged since last read" in text.lower():
        return "未变更（与上次读取相同）"
    fp = _file_path(tool_input)
    body = strip_line_numbers(text)
    lines = [ln for ln in body.splitlines() if ln.strip()]
    n = len(lines)
    if fp and is_chapter_vfs_path(fp):
        head = format_chapter_read_excerpt(content, body_limit=120)
        if head:
            suffix = f"（共 {n} 行）" if n else ""
            return f"{head}{suffix}" if suffix not in head else head
    if fp and is_memory_vfs_path(fp):
        head = format_memory_read_excerpt(content, limit=120)
        if head:
            return f"{head}（共 {n} 行）" if n else head
    roster = extract_memory_read_labels_from_text(body)
    if roster:
        return f"已读取记忆：{roster[0]}" + (
            f" 等 {len(roster)} 项" if len(roster) > 1 else ""
        )
    if n <= 1:
        return "已读取 1 行"
    return f"已读取 {n} 行"


def extract_memory_read_labels_from_text(content: str) -> list[str]:
    from app.agent.harness.events import extract_memory_read_labels

    return extract_memory_read_labels(content)


def glob_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    text = content or ""
    ch = _INVENTORY_CHAPTER_RE.search(text)
    mem = _INVENTORY_MEMORY_RE.search(text)
    if ch or mem:
        parts: list[str] = []
        if ch:
            parts.append(f"{ch.group(1)} 条章节路径")
        if mem:
            parts.append(f"{mem.group(1)} 条记忆路径")
        return "列举：" + "、".join(parts)
    excerpt = format_glob_grep_excerpt(text, limit=200)
    return excerpt or "列举完成"


def grep_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    text = strip_line_numbers(content or "")
    if not text.strip() or "(no matches)" in text.lower():
        return "未找到匹配"
    lines = [ln for ln in text.splitlines() if ln.strip() and not ln.startswith("#")]
    n = len(lines)
    if n <= 1:
        return "找到 1 处匹配"
    return f"找到 {n} 处匹配"


def write_edit_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    fp = _file_path(tool_input)
    text = (content or "").strip()
    if not text:
        return ""
    if "stream" in text.lower() and "chapter body" in text.lower():
        return "章节正文生成中…"
    if text.startswith(("已写入", "已更新", "已删除", "记忆", "Wrote", "Edited")):
        return _first_line(text)
    canonical = normalize_tool_name(str(tool_input.get("_tool") or "Write"))
    if fp and is_memory_vfs_path(fp):
        return format_memory_mutation_message(
            "edit" if canonical == "Edit" else "write", fp
        )
    if fp and is_chapter_vfs_path(fp):
        return format_write_success_message(
            "edit" if canonical == "Edit" else "write", "", fp
        )
    return _first_line(text)


def delete_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    text = (content or "").strip()
    if text and not text.lower().startswith("deleted"):
        return _first_line(text)
    return format_delete_display_message(_file_path(tool_input))


def todo_write_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    """CC TodoWrite: panel only, no transcript body."""
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


def tool_search_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    lines = [ln.strip() for ln in (content or "").splitlines() if ln.strip()]
    if not lines or lines[0].startswith("(no"):
        return "未找到可发现工具"
    if len(lines) == 1:
        return f"已发现工具：{lines[0]}"
    return f"已发现 {len(lines)} 个工具"


def plan_mode_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    low = (content or "").lower()
    if "entered" in low or "enter" in low:
        return "已进入计划模式"
    if "exited" in low or "exit" in low:
        return "已退出计划模式"
    return _first_line(content)


def brief_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    return "已记录运行摘要"


def skill_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    m = re.search(r"Skill\s+(\S+)", content or "")
    return f"已调用技能：{m.group(1)}" if m else _first_line(content)


def agent_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    if "queued" in (content or "").lower():
        return "子任务已排队"
    return _first_line(content, limit=200)


def task_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    text = (content or "").strip()
    if text.startswith("Task ") and "created" in text:
        return "已创建子任务"
    if text == "Task updated.":
        return "子任务已更新"
    if text == "Task stopped.":
        return "子任务已停止"
    if text == "task not found":
        return "子任务不存在"
    if text.startswith("{") or text.startswith("["):
        try:
            data = json.loads(text)
            if isinstance(data, list):
                return f"共 {len(data)} 个子任务"
            if isinstance(data, dict):
                return f"子任务：{data.get('subject') or data.get('id') or '详情'}"
        except json.JSONDecodeError:
            pass
    return _first_line(text)


def web_stub_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    return _first_line(content, limit=160)


def resolve_tool_ui_excerpt(
    tool: str,
    content: str,
    tool_input: dict[str, Any] | None = None,
) -> str | None:
    """Return UI excerpt when tool defines ``ui_excerpt``; None → generic fallback."""
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
    write = lambda c, i: write_edit_ui_excerpt(c, {**i, "_tool": "WriteChapter"})
    edit = lambda c, i: write_edit_ui_excerpt(c, {**i, "_tool": "EditChapter"})
    return {
        "ReadChapter": read_ui_excerpt,
        "ReadMemory": read_ui_excerpt,
        "ListChapters": glob_ui_excerpt,
        "ListMemory": glob_ui_excerpt,
        "SearchKnowledge": grep_ui_excerpt,
        "WriteChapter": write,
        "EditChapter": edit,
        "WriteMemory": write,
        "EditMemory": edit,
        "DeleteChapter": delete_ui_excerpt,
        "DeleteMemory": delete_ui_excerpt,
        "ClearMemory": delete_ui_excerpt,
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
    if not key:
        return None
    if key in _REGISTRY:
        return _REGISTRY[key]
    return _REGISTRY.get(normalize_tool_name(key))
