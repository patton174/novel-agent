"""Per-tool UI excerpts (SSE only — model text stays in ToolCallResult.content)."""

from __future__ import annotations

import json
import re
from collections.abc import Callable
from typing import Any

from app.agent.backend.format import FILE_UNCHANGED_STUB
from app.agent.harness.tool_display import (
    format_chapter_title_only,
    format_memory_read_excerpt,
    strip_line_numbers,
)

UiExcerptFn = Callable[[str, dict[str, Any]], str]

_REGISTRY: dict[str, UiExcerptFn] | None = None


def _first_line(text: str, *, limit: int = 240) -> str:
    line = (text or "").strip().split("\n", 1)[0].strip()
    return line[:limit] + ("…" if len(line) > limit else "")


def _is_json_object_text(text: str) -> bool:
    raw = (text or "").strip()
    if not raw.startswith("{"):
        return False
    try:
        parsed = json.loads(raw)
        return isinstance(parsed, dict)
    except (json.JSONDecodeError, TypeError):
        return False


def _safe_first_line(text: str, *, limit: int = 240) -> str:
    """Never surface raw JSON tool acks as UI titles."""
    if _is_json_object_text(text):
        return ""
    return _first_line(text, limit=limit)


def _format_title_label(title: str) -> str:
    t = (title or "").strip()
    if not t:
        return ""
    if t.startswith("《") and t.endswith("》"):
        return t
    return f"《{t}》"


def generic_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    return _safe_first_line(content)


def read_chapter_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    inp_title = str(tool_input.get("title") or "").strip()
    if inp_title:
        return _format_title_label(inp_title)
    index = tool_input.get("index")
    if isinstance(index, int) and index > 0:
        return f"第{index}章"
    if isinstance(index, str) and index.strip().isdigit() and int(index.strip()) > 0:
        return f"第{int(index.strip())}章"

    text = (content or "").strip()
    if not text:
        return "空章节"
    if FILE_UNCHANGED_STUB in text or "unchanged since last read" in text.lower():
        title = format_chapter_title_only(content)
        return title or "未变更"
    title = format_chapter_title_only(content)
    if title:
        return title
    body = strip_line_numbers(text).strip()
    if body:
        return "已读取"
    return "空章节"


def read_memory_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    text = (content or "").strip()
    if not text:
        return "（空）"
    if text.startswith("# "):
        return text.split("\n", 1)[0].lstrip("# ").strip()[:96]
    head = format_memory_read_excerpt(content, limit=96)
    first = (head or "").split("\n", 1)[0].strip()
    return first or "（空）"


def list_chapters_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    try:
        data = json.loads(content or "")
        if isinstance(data, dict):
            chs = data.get("chapters")
            count = int(data.get("count") or (len(chs) if isinstance(chs, list) else 0))
            return f"{count} 章" if count else "暂无章节"
    except (json.JSONDecodeError, TypeError, ValueError):
        pass
    return "（空）"


def list_memory_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    scope = str(tool_input.get("scope") or "").strip()
    try:
        data = json.loads(content or "")
        if isinstance(data, dict):
            entries = data.get("entries")
            count = len(entries) if isinstance(entries, list) else int(data.get("count") or 0)
            if scope:
                return f"{scope} · {count} 项" if count else f"{scope}（空）"
            return f"{count} 项" if count else "暂无记忆项"
    except (json.JSONDecodeError, TypeError, ValueError):
        pass
    return scope or "（空）"


def get_memory_tree_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    try:
        data = json.loads(content or "")
    except (json.JSONDecodeError, TypeError):
        return "（空）"
    if not isinstance(data, dict):
        return "（空）"
    scope = str(data.get("scope") or "").strip()
    nodes = data.get("nodes") if isinstance(data.get("nodes"), list) else []
    count = int(data.get("count") or len(nodes) or 0)
    if scope:
        return f"{scope} · {count} 项" if count else f"{scope}（空）"
    return f"{count} 项" if count else "（空）"


def search_session_history_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    query = str(tool_input.get("query") or "").strip()
    run_id = str(tool_input.get("run_id") or "").strip()
    try:
        data = json.loads(content or "")
        if isinstance(data, dict):
            if data.get("mode") == "run_fetch":
                hit = data.get("hit") if isinstance(data.get("hit"), dict) else {}
                turns = hit.get("turns") if isinstance(hit.get("turns"), list) else []
                rid = run_id or str(hit.get("run_id") or "?")
                return f"run {rid} · {len(turns)} 条"
            hits = data.get("hits")
            count = len(hits) if isinstance(hits, list) else 0
            if query:
                q = query if len(query) <= 24 else query[:23] + "…"
                return f"「{q}」· {count} 处" if count else f"「{q}」· 无匹配"
            return f"{count} 处" if count else "（无匹配）"
    except (json.JSONDecodeError, TypeError):
        pass
    return "会话检索"


def search_knowledge_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    query = str(tool_input.get("query") or "").strip()
    try:
        data = json.loads(content or "")
        if isinstance(data, dict):
            hits = data.get("hits")
            count = len(hits) if isinstance(hits, list) else 0
            if query:
                q = query if len(query) <= 24 else query[:23] + "…"
                return f"「{q}」· {count} 处" if count else f"「{q}」· 无匹配"
            return f"{count} 处" if count else "（无匹配）"
    except (json.JSONDecodeError, TypeError):
        pass
    text = strip_line_numbers(content or "")
    lines = [ln for ln in text.splitlines() if ln.strip()]
    count = len(lines)
    if query:
        q = query if len(query) <= 24 else query[:23] + "…"
        return f"「{q}」· {count} 处" if count else f"「{q}」· 无匹配"
    return f"{count} 处" if count else "（无匹配）"


def get_character_graph_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    character = str(tool_input.get("character") or "").strip()
    try:
        data = json.loads(content or "")
        if isinstance(data, dict):
            nodes = data.get("nodes")
            count = len(nodes) if isinstance(nodes, list) else 0
            if character:
                return f"{character} · {count} 节点" if count else f"{character}（空）"
            return f"{count} 节点" if count else "（空）"
    except (json.JSONDecodeError, TypeError):
        pass
    return character or "（空）"


def write_chapter_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    title = str(tool_input.get("title") or "").strip()
    if title:
        return _format_title_label(title)
    try:
        data = json.loads(content or "")
        if isinstance(data, dict):
            from_title = str(data.get("title") or "").strip()
            if from_title:
                return _format_title_label(from_title)
            idx = data.get("index")
            if isinstance(idx, int) and idx > 0:
                return f"第{idx}章"
    except (json.JSONDecodeError, TypeError):
        pass
    text = (content or "").strip()
    if "stream" in text.lower() and "chapter body" in text.lower():
        return ""
    parsed = format_chapter_title_only(content)
    if parsed:
        return parsed
    return _safe_first_line(text, limit=96)


def _chapter_index_label(tool_input: dict[str, Any], content: str = "") -> str:
    index = tool_input.get("index")
    if isinstance(index, int) and index > 0:
        return f"第{index}章"
    if isinstance(index, str) and index.strip().isdigit() and int(index.strip()) > 0:
        return f"第{int(index.strip())}章"
    try:
        data = json.loads(content or "")
        if isinstance(data, dict):
            idx = data.get("index")
            if isinstance(idx, int) and idx > 0:
                return f"第{idx}章"
    except (json.JSONDecodeError, TypeError):
        pass
    return ""


def _line_edit_label(tool_input: dict[str, Any]) -> str:
    line_start = tool_input.get("line_start")
    line_end = tool_input.get("line_end")
    try:
        start = int(line_start) if line_start is not None else 0
    except (TypeError, ValueError):
        start = 0
    if start < 1:
        return ""
    try:
        end = int(line_end) if line_end is not None else start
    except (TypeError, ValueError):
        end = start
    if end > start:
        return f"第{start}-{end}行"
    return f"第{start}行"


def edit_chapter_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    new_title = str(tool_input.get("new_title") or "").strip()
    if new_title:
        return _format_title_label(new_title)

    line_label = _line_edit_label(tool_input)
    chapter_label = _chapter_index_label(tool_input, content)
    title = str(tool_input.get("title") or "").strip()
    if title:
        chapter_label = _format_title_label(title)

    if line_label:
        return f"{chapter_label} · {line_label}" if chapter_label else line_label

    if tool_input.get("rewrite"):
        return f"{chapter_label} · 重写正文" if chapter_label else "重写正文"

    if tool_input.get("new_content") is not None:
        return f"{chapter_label} · 替换正文" if chapter_label else "替换正文"

    move_index = tool_input.get("index")
    if move_index is not None and tool_input.get("line_start") is None:
        try:
            pos = int(move_index)
            if pos > 0:
                base = chapter_label or "章节"
                return f"{base} → 第{pos}位"
        except (TypeError, ValueError):
            pass

    if chapter_label:
        return chapter_label

    parsed = format_chapter_title_only(content)
    if parsed:
        return parsed
    if (content or "").strip().startswith("{"):
        return ""
    return _safe_first_line(content, limit=96)


def create_memory_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    title = str(tool_input.get("title") or "").strip()
    if title:
        return title
    scope = str(tool_input.get("scope") or "").strip()
    try:
        data = json.loads(content or "")
        if isinstance(data, dict):
            from_title = str(data.get("title") or "").strip()
            if from_title:
                return from_title
            if data.get("memory_id") and scope:
                return scope
    except json.JSONDecodeError:
        pass
    head = _safe_first_line(content, limit=96)
    if head.startswith("CreateMemory OK"):
        m = re.search(r"title='([^']*)'", head)
        if m and m.group(1).strip():
            return m.group(1).strip()
    return head


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
    head = (content or "").strip().split("\n", 1)[0].strip()
    m = re.search(r"title='([^']*)'", head)
    if m and m.group(1).strip():
        return m.group(1).strip()
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
    index = tool_input.get("index")
    if isinstance(index, int) and index > 0:
        return f"第{index}章"
    if isinstance(index, str) and index.strip().isdigit() and int(index.strip()) > 0:
        return f"第{int(index.strip())}章"
    parsed = format_chapter_title_only(content)
    if parsed:
        return parsed
    if _is_json_object_text(content):
        return "已删除"
    text = (content or "").strip()
    if text and not text.lower().startswith("deleted"):
        return _safe_first_line(text, limit=96)
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
        return _safe_first_line(text, limit=96)
    return ""


def todo_write_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = content, tool_input
    return ""


def ask_user_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    if "waiting" in (content or "").lower():
        return ""
    return _safe_first_line(content, limit=96)


def reorder_chapters_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    try:
        data = json.loads(content or "")
        if isinstance(data, dict):
            count = int(data.get("count") or len(data.get("order") or []) or 0)
            if count:
                return f"{count} 章"
    except (json.JSONDecodeError, TypeError, ValueError):
        pass
    m = re.search(r"Reordered\s+(\d+)", content or "", re.I)
    if m:
        return f"{m.group(1)} 章"
    return ""


def chapter_audit_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    try:
        data = json.loads(content or "")
        if isinstance(data, dict):
            if data.get("ok"):
                return "目录正常"
            issues = 0
            dupes = data.get("duplicate_titles")
            if isinstance(dupes, dict):
                issues += len(dupes)
            for key in ("empty_chapters", "title_has_chapter_number"):
                block = data.get(key)
                if isinstance(block, list):
                    issues += len(block)
            return f"{issues} 项问题" if issues else "目录正常"
    except (json.JSONDecodeError, TypeError):
        pass
    return ""


def narrative_review_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    try:
        data = json.loads(content or "")
        if isinstance(data, dict):
            findings = data.get("findings")
            if isinstance(findings, list):
                return f"{len(findings)} 项发现" if findings else "无问题"
            if data.get("ok"):
                return "无问题"
    except (json.JSONDecodeError, TypeError):
        pass
    return _safe_first_line(content, limit=48)


def skill_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    try:
        data = json.loads(content or "")
        if isinstance(data, dict) and data.get("skill"):
            return str(data["skill"]).strip()
    except (json.JSONDecodeError, TypeError):
        pass
    m = re.search(r"Skill\s+(\S+)", content or "")
    return m.group(1) if m else _safe_first_line(content, limit=96)


def agent_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    return _safe_first_line(content, limit=96)


def web_stub_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    _ = tool_input
    return _safe_first_line(content, limit=48)


def list_mcp_resources_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    server = str(tool_input.get("server") or "").strip()
    try:
        data = json.loads(content or "")
        if isinstance(data, list):
            return f"{server or 'MCP'} · {len(data)} 项" if data else f"{server or 'MCP'}（空）"
    except (json.JSONDecodeError, TypeError):
        pass
    return server or "MCP"


def read_mcp_resource_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    uri = str(tool_input.get("uri") or "").strip()
    if uri:
        return uri if len(uri) <= 48 else uri[:47] + "…"
    return _safe_first_line(content, limit=48)


def call_mcp_tool_ui_excerpt(content: str, tool_input: dict[str, Any]) -> str:
    name = str(tool_input.get("tool") or tool_input.get("name") or "").strip()
    return name or _safe_first_line(content, limit=48)


def resolve_tool_result_title(
    tool: str,
    content: str,
    tool_input: dict[str, Any] | None = None,
    *,
    file_path: str = "",
) -> str:
    """Single-line result title for tool.completed SSE (action comes from display_name)."""
    inp = dict(tool_input or {})
    if file_path:
        inp.setdefault("file_path", file_path)
    excerpt = resolve_tool_ui_excerpt(tool, content, inp)
    if excerpt is not None:
        line = excerpt.strip().split("\n", 1)[0].strip()
        if line and not _is_json_object_text(line):
            return line
    return ""


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
        "SearchSessionHistory": search_session_history_ui_excerpt,
        "GetCharacterGraph": get_character_graph_ui_excerpt,
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
        "ChapterAudit": chapter_audit_ui_excerpt,
        "NarrativeReview": narrative_review_ui_excerpt,
        "Skill": skill_ui_excerpt,
        "Agent": agent_ui_excerpt,
        "WebFetch": web_stub_ui_excerpt,
        "WebSearch": web_stub_ui_excerpt,
        "ListMcpResources": list_mcp_resources_ui_excerpt,
        "ReadMcpResource": read_mcp_resource_ui_excerpt,
        "CallMcpTool": call_mcp_tool_ui_excerpt,
    }


def default_ui_excerpt_for_name(tool: str) -> UiExcerptFn | None:
    global _REGISTRY
    if _REGISTRY is None:
        _REGISTRY = default_ui_excerpt_registry()
    key = (tool or "").strip()
    return _REGISTRY.get(key) if key else None
