"""Interaction and task-tracking tools."""

from __future__ import annotations

from typing import Any

from app.agent.tools.schemas import AgentInput, AskUserInput, TodoWriteInput
from app.agent.schemas import AgentRunContext
from app.agent.tools.tool import ToolCallResult, build_tool


async def ask_user(ctx: AgentRunContext, inp: AskUserInput) -> ToolCallResult:
    return ToolCallResult(
        content="Waiting for user response.",
        action="wait",
        wait_for="interaction",
        interaction={
            "kind": "choose" if inp.options else "ask_user",
            "questions": inp.questions,
            "options": inp.options or [],
        },
    )


async def todo_write(ctx: AgentRunContext, inp: TodoWriteInput) -> ToolCallResult:
    patch = dict(ctx.context_patch or {})
    existing = list(patch.get("todos") or []) if inp.merge else []
    by_id: dict[str, Any] = {
        str(t.get("id")): t for t in existing if isinstance(t, dict) and t.get("id")
    }
    for t in inp.todos:
        item = t.model_dump()
        by_id[str(item["id"])] = item
    todos = list(by_id.values())
    return ToolCallResult(content="Todos updated.", context_patch={"todos": todos})


async def run_agent(ctx: AgentRunContext, inp: AgentInput) -> ToolCallResult:
    from app.agent.harness.subagent import run_subagent

    return await run_subagent(
        ctx,
        description=(inp.description or "").strip() or "子任务",
        prompt=(inp.prompt or "").strip(),
    )


INTERACTION_TOOLS = [
    build_tool(
        name="AskUser",
        description="Ask the user questions or present options.",
        input_model=AskUserInput,
        call=ask_user,
    ),
    build_tool(
        name="TodoWrite",
        description="Update the task todo list. Each todo needs id + content + status.",
        input_model=TodoWriteInput,
        call=todo_write,
    ),
    build_tool(
        name="Agent",
        description=(
            "Spawn a sub-agent for ONE focused slice (≤4 chapters or ≤6 heavy steps). "
            "Parent splits work via TodoWrite; never delegate the whole book in one call."
        ),
        input_model=AgentInput,
        call=run_agent,
        is_concurrency_safe=lambda _i: True,
        user_facing_name=lambda inp: (
            f"子任务：{(inp.description or '子任务')[:32]}" if inp else "子任务"
        ),
    ),
]
