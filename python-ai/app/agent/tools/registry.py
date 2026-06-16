"""Agent tool registry — flat domain tools, no defer/legacy."""

from __future__ import annotations

from app.agent.harness.review_agent import REVIEW_AGENT_ALLOWED_TOOLS, is_review_agent
from app.agent.harness.subagent_policy import SUBAGENT_EXCLUDED_TOOLS, is_subagent_run
from app.agent.schemas import AgentRunContext
from app.agent.tools.chapter import CHAPTER_TOOLS
from app.agent.tools.interaction import INTERACTION_TOOLS
from app.agent.tools.knowledge import KNOWLEDGE_TOOLS
from app.agent.tools.mcp import MCP_TOOLS
from app.agent.tools.memory import MEMORY_TOOLS
from app.agent.tools.narrative_review import NARRATIVE_REVIEW_TOOL
from app.agent.tools.skill import SKILL_TOOLS
from app.agent.tools.tool import AgentTool
from app.agent.tools.web import WEB_TOOLS

_TOOLS: list[AgentTool] | None = None


def build_agent_tools() -> list[AgentTool]:
    return [
        *CHAPTER_TOOLS,
        NARRATIVE_REVIEW_TOOL,
        *MEMORY_TOOLS,
        *KNOWLEDGE_TOOLS,
        *INTERACTION_TOOLS,
        *WEB_TOOLS,
        *MCP_TOOLS,
        *SKILL_TOOLS,
    ]


def _load_tools() -> list[AgentTool]:
    global _TOOLS
    if _TOOLS is None:
        _TOOLS = build_agent_tools()
    return _TOOLS


def get_all_tools(ctx: AgentRunContext | None = None) -> list[AgentTool]:
    tools = [t for t in _load_tools() if ctx is None or t.is_enabled(ctx)]
    if ctx is not None and is_subagent_run(ctx):
        if is_review_agent(ctx):
            return [t for t in tools if t.name in REVIEW_AGENT_ALLOWED_TOOLS]
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
    """Defer mechanism removed — always False."""
    _ = name
    return False


def is_tool_discovered(ctx: AgentRunContext, name: str) -> bool:
    """All tools always available — no ToolSearch gate."""
    _ = ctx, name
    return True


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
