"""Tool visibility — aligned with frontend agentOrchestration / agentToolNames."""

from __future__ import annotations

from typing import Any

HIDDEN_UI_TOOLS = frozenset(
    {"output", "end", "PlanResult", "StepResult", "Brief", "TodoWrite"}
)
LEGACY_HIDDEN_TOOLS = frozenset({"orchestrator", "plan", "write_chapter"})

TOOL_DISPLAY_NAMES: dict[str, str] = {
    "ListChapters": "列举章节",
    "ReadChapter": "阅读章节",
    "WriteChapter": "写入章节",
    "EditChapter": "编辑章节",
    "DeleteChapter": "删除章节",
    "ReorderChapters": "调整章节顺序",
    "ListMemory": "列举记忆",
    "ReadMemory": "查阅记忆",
    "WriteMemory": "写入记忆",
    "EditMemory": "编辑记忆",
    "DeleteMemory": "删除记忆",
    "ClearMemory": "清空记忆",
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
    """Hidden tools still forward tool.completed when the payload drives UI state."""
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


def is_memory_vfs_path(path: str) -> bool:
    return "/memory/" in (path or "")


def is_chapter_vfs_path(path: str) -> bool:
    return "/chapters/" in (path or "")


def vfs_path_from_tool_input(tool_input: dict[str, Any] | None) -> str:
    if not tool_input:
        return ""
    for key in ("file_path", "path", "target_file"):
        val = tool_input.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return ""


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
    if raw in ("ReadMemory", "WriteMemory", "EditMemory") and inp.get("key"):
        return TOOL_DISPLAY_NAMES.get(raw, raw)
    return raw


def should_emit_tool_started(tool: str) -> bool:
    return not is_hidden_ui_tool(tool)


def should_skip_java_step_started_forward(tool: str | None) -> bool:
    """PyAI gateway: step.started for AskUser is internal; tool.started carries UI."""
    return is_ask_user_tool(tool)


def should_bridge_llm_delta_to_chat(tool: str | None) -> bool:
    """Legacy output tool streaming via message.delta bridge."""
    return (tool or "").strip() == "output"


def should_forward_worker_live_event(event: dict[str, Any]) -> bool:
    """Queued worker Redis fanout: drop frames the browser must not receive (align Java RunLiveSseFanout)."""
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


def should_emit_read_result_labels(tool: str, file_path: str) -> bool:
    raw = (tool or "").strip()
    if raw in ("ReadChapter", "ReadMemory"):
        return True
    if raw == "SearchKnowledge":
        return False
    if not file_path:
        return False
    return is_memory_vfs_path(file_path) or is_chapter_vfs_path(file_path)
