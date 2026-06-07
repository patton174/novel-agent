"""Pre/Post tool hooks (CC toolHooks.py skeleton)."""

from __future__ import annotations

from typing import Any

from app.agent.schemas import AgentRunContext
from app.agent.tools.tool import AgentTool, ToolCallResult


async def run_pre_tool_hooks(
    tool: AgentTool,
    tool_use_id: str,
    raw_input: dict[str, Any],
    ctx: AgentRunContext,
) -> tuple[dict[str, Any], str | None]:
    _ = tool, tool_use_id, ctx
    return dict(raw_input or {}), None


async def run_post_tool_hooks(
    tool: AgentTool,
    tool_use_id: str,
    raw_input: dict[str, Any],
    result: ToolCallResult,
    ctx: AgentRunContext,
) -> ToolCallResult:
    _ = tool, tool_use_id, raw_input, ctx
    return result
