"""Tool registry (CC getAllBaseTools equivalent)."""

from __future__ import annotations

from app.agent_step.schemas import AgentRunContext
from app.agent_step.subagent_policy import SUBAGENT_EXCLUDED_TOOLS, is_subagent_run
from app.agent_step.tools.cc import build_cc_tools
from app.agent_step.tools.tool import AgentTool

_TOOLS: list[AgentTool] | None = None

CORE_ALWAYS_LOAD = frozenset(
    {
        "Read",
        "Write",
        "Edit",
        "Glob",
        "Grep",
        "AskUser",
        "TodoWrite",
        "ToolSearch",
        "EnterPlanMode",
        "Agent",
    }
)


def _load_tools() -> list[AgentTool]:
    global _TOOLS
    if _TOOLS is None:
        _TOOLS = build_cc_tools()
    return _TOOLS


def get_all_tools(ctx: AgentRunContext | None = None) -> list[AgentTool]:
    tools = [t for t in _load_tools() if ctx is None or t.is_enabled(ctx)]
    if ctx is not None and is_subagent_run(ctx):
        tools = [t for t in tools if t.name not in SUBAGENT_EXCLUDED_TOOLS]
    return tools


def get_tool_names(ctx: AgentRunContext | None = None) -> frozenset[str]:
    return frozenset(t.name for t in get_all_tools(ctx))


def find_tool_by_name(name: str) -> AgentTool | None:
    key = (name or "").strip()
    for t in _load_tools():
        if t.name == key or key in t.aliases:
            return t
    return None


def is_deferred_tool(name: str) -> bool:
    t = find_tool_by_name(name)
    if t is None:
        return False
    if t.name in CORE_ALWAYS_LOAD or t.always_load:
        return False
    return bool(t.defer_loading)


def is_tool_discovered(ctx: AgentRunContext, name: str) -> bool:
    if not is_deferred_tool(name):
        return True
    patch = ctx.context_patch if isinstance(ctx.context_patch, dict) else {}
    if patch.get("_subagent_disable_defer"):
        return (name or "").strip() not in SUBAGENT_EXCLUDED_TOOLS
    discovered = patch.get("_discovered_tools") or []
    return name in discovered


def partition_concurrency_safe(tool_name: str, raw_input: dict) -> bool:
    tool = find_tool_by_name(tool_name)
    if tool is None:
        return False
    parsed, err = tool.parse_input(raw_input)
    if parsed is None or err:
        return False
    try:
        return bool(tool.is_concurrency_safe(parsed))
    except Exception:
        return False
