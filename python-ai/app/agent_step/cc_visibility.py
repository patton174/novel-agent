"""CC tool visibility — aligned with frontend agentOrchestration / agentToolNames."""

from __future__ import annotations

from typing import Any

# Mirrors frontend HIDDEN_UI_TOOLS
HIDDEN_UI_TOOLS = frozenset(
    {"output", "end", "PlanResult", "StepResult", "Brief", "TodoWrite"}
)
LEGACY_HIDDEN_TOOLS = frozenset({"orchestrator", "plan", "write_chapter"})

LEGACY_TOOL_ALIASES: dict[str, str] = {
    "chapter_list": "Glob",
    "chapter_read": "Read",
    "chapter_create": "Write",
    "chapter_update": "Edit",
    "chapter_delete": "Delete",
    "memory_read": "Read",
    "memory_create": "Write",
    "memory_update": "Edit",
    "memory_delete": "Delete",
    "memory_patch": "Edit",
    "choose": "AskUser",
    "ask_user": "AskUser",
    "context_search": "Grep",
}

CC_TOOL_DISPLAY_NAMES: dict[str, str] = {
    "Read": "读取",
    "Write": "写入",
    "Edit": "编辑",
    "Glob": "列举",
    "Grep": "搜索",
    "Delete": "删除",
    "AskUser": "询问",
    "TodoWrite": "任务",
    "ToolSearch": "查找工具",
    "WebFetch": "抓取网页",
    "WebSearch": "网页搜索",
    "EnterPlanMode": "计划模式",
    "ExitPlanMode": "退出计划",
    "Brief": "摘要",
    "Skill": "技能",
    "Agent": "子任务",
    "TaskCreate": "创建任务",
    "TaskGet": "查看任务",
    "TaskList": "任务列表",
    "TaskUpdate": "更新任务",
    "TaskStop": "停止任务",
    "NotebookEdit": "编辑笔记本",
    "ListMcpResources": "MCP 资源",
    "ReadMcpResource": "读取 MCP",
}

LEGACY_DISPLAY_NAMES: dict[str, str] = {
    "chapter_list": "列举章节",
    "chapter_read": "阅读章节",
    "chapter_create": "写入章节",
    "chapter_update": "编辑章节",
    "chapter_delete": "删除章节",
    "memory_read": "查阅记忆",
    "memory_create": "写入记忆",
    "memory_update": "编辑记忆",
    "memory_delete": "删除记忆",
    "memory_patch": "编辑记忆",
    "choose": "询问",
    "ask_user": "询问",
    "output": "回复",
    "context_search": "搜索",
}


def normalize_tool_name(name: str) -> str:
    raw = (name or "").strip()
    if not raw:
        return ""
    return LEGACY_TOOL_ALIASES.get(raw, raw)


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
    raw = (name or "").strip()
    return raw in ("AskUser", "choose", "ask_user")


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
    if raw in LEGACY_DISPLAY_NAMES:
        return LEGACY_DISPLAY_NAMES[raw]
    path = vfs_path_from_tool_input(tool_input)
    canonical = normalize_tool_name(raw)
    if canonical == "Read" and path:
        if is_memory_vfs_path(path):
            return "查阅创作记忆"
        if is_chapter_vfs_path(path):
            return "阅读章节"
    if canonical == "Write" and path and is_chapter_vfs_path(path):
        return "写入章节"
    if canonical == "Write" and path and is_memory_vfs_path(path):
        return "写入创作记忆"
    if canonical == "Edit" and path and is_memory_vfs_path(path):
        return "编辑创作记忆"
    if canonical == "Delete" and path and is_memory_vfs_path(path):
        return "删除创作记忆"
    if canonical == "Glob" and path and "chapter" in path:
        return "查阅章节目录"
    return CC_TOOL_DISPLAY_NAMES.get(canonical) or CC_TOOL_DISPLAY_NAMES.get(raw) or raw


def should_emit_tool_started(tool: str) -> bool:
    return not is_hidden_ui_tool(tool)


def should_skip_java_step_started_forward(tool: str | None) -> bool:
    """PyAI gateway: step.started for AskUser is internal; tool.started carries UI."""
    return is_ask_user_tool(tool)


def should_bridge_llm_delta_to_chat(tool: str | None) -> bool:
    """Legacy output tool streaming via message.delta bridge."""
    return (tool or "").strip() == "output"


def should_emit_read_result_labels(tool: str, file_path: str) -> bool:
    raw = (tool or "").strip()
    if raw == "memory_read":
        return True
    canonical = normalize_tool_name(raw)
    if canonical not in ("Read", "Grep") or not file_path:
        return False
    return is_memory_vfs_path(file_path) or is_chapter_vfs_path(file_path)
