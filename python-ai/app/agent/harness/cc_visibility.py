"""Tool visibility — aligned with frontend agentOrchestration / agentToolNames."""

from __future__ import annotations

from typing import Any

HIDDEN_UI_TOOLS = frozenset(
    {"output", "end", "PlanResult", "StepResult", "Brief", "TodoWrite"}
)
LEGACY_HIDDEN_TOOLS = frozenset({"orchestrator", "plan", "write_chapter"})

READ_RESULT_LABEL_TOOLS = frozenset()

_CHAPTER_STREAM_UI_TOOLS = frozenset({"WriteChapter", "EditChapter"})


def should_emit_tool_progress_log(tool: str | None) -> bool:
    """During tool run: only chapter write/edit stream progress (Agent uses subagent_sse)."""
    return normalize_tool_name(tool or "") in _CHAPTER_STREAM_UI_TOOLS


def should_stream_tool_result_excerpt(tool: str | None) -> bool:
    """Do not stream display_excerpt chunks in tool.progress after tool completes."""
    _ = tool
    return False


def sse_tool_result_title_only(tool: str | None) -> bool:
    """tool.completed carries a single result title; tool name already shows the action."""
    raw = normalize_tool_name(tool or "")
    if raw in _CHAPTER_STREAM_UI_TOOLS:
        return False
    if raw == "Agent":
        return False
    if is_ask_user_tool(raw):
        return False
    return True

# Chinese labels are stable wire keys; frontend maps via editor:tools.* (see AGENTS.md § SSE i18n).
TOOL_DISPLAY_NAMES: dict[str, str] = {
    "ListChapters": "列举章节",
    "ReadChapter": "阅读章节",
    "WriteChapter": "写入章节",
    "EditChapter": "编辑章节",
    "DeleteChapter": "删除章节",
    "ReorderChapters": "调整章节顺序",
    "ChapterAudit": "章节目录审查",
    "NarrativeReview": "叙事审查",
    "ListMemory": "列举记忆",
    "GetMemoryTree": "记忆树",
    "ReadMemory": "查阅记忆",
    "CreateMemory": "创建记忆",
    "UpdateMemoryFields": "更新记忆属性",
    "UpdateMemoryContent": "更新记忆正文",
    "UpdateMemoryMeta": "更新记忆元数据",
    "MoveMemory": "移动记忆",
    "DeleteMemory": "删除记忆",
    "SearchKnowledge": "知识检索",
    "GetCharacterGraph": "角色关系图",
    "AskUser": "询问",
    "TodoWrite": "任务",
    "WebFetch": "抓取网页",
    "WebSearch": "网页搜索",
    "Skill": "技能",
    "Agent": "子任务",
    "ListMcpResources": "MCP 资源",
    "ReadMcpResource": "读取 MCP",
    "CallMcpTool": "MCP 工具",
}


def normalize_tool_name(name: str) -> str:
    return (name or "").strip()


def should_forward_tool_completed_to_client(name: str | None) -> bool:
    return (name or "").strip() == "TodoWrite"


def is_hidden_ui_tool(name: str | None) -> bool:
    raw = (name or "").strip()
    if not raw:
        return False
    return raw in HIDDEN_UI_TOOLS or raw in LEGACY_HIDDEN_TOOLS


def is_hidden_timeline_tool(name: str | None) -> bool:
    return is_hidden_ui_tool(name)


def is_ask_user_tool(name: str | None) -> bool:
    return (name or "").strip() == "AskUser"


def tool_display_name(tool: str, tool_input: dict[str, Any] | None = None) -> str:
    raw = (tool or "").strip()
    if not raw:
        return "工具"
    if raw in TOOL_DISPLAY_NAMES:
        return TOOL_DISPLAY_NAMES[raw]
    inp = tool_input or {}
    if raw == "ReadChapter" and inp.get("chapter_id"):
        return "阅读章节"
    if raw == "WriteChapter" and inp.get("title"):
        return "写入章节"
    if raw in ("ReadMemory", "CreateMemory", "UpdateMemoryFields", "UpdateMemoryContent", "UpdateMemoryMeta") and (
        inp.get("memory_id") or inp.get("title")
    ):
        return TOOL_DISPLAY_NAMES.get(raw, raw)
    return raw


def should_emit_tool_started(tool: str) -> bool:
    return not is_hidden_ui_tool(tool)


def should_skip_java_step_started_forward(tool: str | None) -> bool:
    return is_ask_user_tool(tool)


def should_bridge_llm_delta_to_chat(tool: str | None) -> bool:
    return (tool or "").strip() == "output"


def should_forward_worker_live_event(event: dict[str, Any]) -> bool:
    et = str(event.get("type") or "")
    if et in ("step.completed", "plan.result"):
        return False
    payload = event.get("payload") if isinstance(event.get("payload"), dict) else {}
    if et == "step.started":
        tool = str(payload.get("tool") or "")
        if should_skip_java_step_started_forward(tool):
            return False
    if et.startswith("tool."):
        name = str(payload.get("name") or "")
        if et == "tool.completed":
            if is_hidden_ui_tool(name) and not should_forward_tool_completed_to_client(name):
                return False
        elif is_hidden_ui_tool(name):
            return False
    return True


def should_emit_read_result_labels(tool: str, _file_path: str = "") -> bool:
    return False
