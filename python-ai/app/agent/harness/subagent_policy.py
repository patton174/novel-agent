"""Subagent constants and context flags (no tool/registry imports)."""

from __future__ import annotations

from app.agent.schemas import AgentRunContext

SUBAGENT_EXCLUDED_TOOLS = frozenset(
    {
        "Agent",
        "AskUser",
        "EnterPlanMode",
        "ExitPlanMode",
        "TaskCreate",
        "TaskGet",
        "TaskList",
        "TaskUpdate",
        "TaskStop",
        "NotebookEdit",
        "ListMcpResources",
        "ReadMcpResource",
    }
)

_PATCH_DEPTH = "_subagent_depth"


def subagent_depth(ctx: AgentRunContext) -> int:
    patch = ctx.context_patch if isinstance(ctx.context_patch, dict) else {}
    try:
        return max(0, int(patch.get(_PATCH_DEPTH) or 0))
    except (TypeError, ValueError):
        return 0


def is_subagent_run(ctx: AgentRunContext) -> bool:
    return subagent_depth(ctx) > 0
