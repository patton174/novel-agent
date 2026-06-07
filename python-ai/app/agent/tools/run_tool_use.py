"""Single tool_use execution (CC toolExecution.runToolUse)."""

from __future__ import annotations

from typing import Any

from app.agent.harness.tool_errors import (
    format_input_validation_error,
    format_no_such_tool_error,
    humanize_tool_validation_error,
)
from app.agent.harness.tool_result_routing import map_tool_result_for_model
from app.agent.schemas import AgentRunContext
from app.agent.tools.hooks import run_post_tool_hooks, run_pre_tool_hooks
from app.agent.tools.registry import find_tool_by_name
from app.agent.tools.result_storage import truncate_tool_result
from app.agent.tools.tool import ToolCallResult


async def run_tool_use(
    tool_name: str,
    raw_input: dict[str, Any],
    ctx: AgentRunContext,
    *,
    tool_use_id: str = "",
) -> ToolCallResult:
    tool = find_tool_by_name(tool_name)
    if tool is None:
        return ToolCallResult(
            content=format_no_such_tool_error(tool_name),
            is_error=True,
        )
    if not tool.is_enabled(ctx):
        return ToolCallResult(
            content=format_no_such_tool_error(tool_name),
            is_error=True,
        )

    parsed, err = tool.parse_input(raw_input)
    if parsed is None:
        detail = humanize_tool_validation_error(
            tool_name,
            err or "invalid input",
            novel_id=str(ctx.novel_id or (ctx.project or {}).get("id") or ""),
        )
        return ToolCallResult(
            content=format_input_validation_error(detail),
            is_error=True,
        )

    if tool.validate_input:
        vr = tool.validate_input(ctx, parsed)
        if not vr.ok:
            return ToolCallResult(
                content=format_input_validation_error(vr.message),
                is_error=True,
            )

    updated_raw, hook_block = await run_pre_tool_hooks(
        tool, tool_use_id, raw_input, ctx
    )
    if hook_block:
        return ToolCallResult(content=format_input_validation_error(hook_block), is_error=True)
    if updated_raw != raw_input:
        parsed, err = tool.parse_input(updated_raw)
        if parsed is None:
            return ToolCallResult(
                content=format_input_validation_error(err or "invalid input after hook"),
                is_error=True,
            )

    try:
        result = await tool.call(ctx, parsed)
    except Exception as exc:
        return ToolCallResult(
            content=format_input_validation_error(str(exc)),
            is_error=True,
        )

    result = await run_post_tool_hooks(tool, tool_use_id, raw_input, result, ctx)
    if result.is_error and result.content and "<tool_use_error>" not in result.content:
        detail = humanize_tool_validation_error(
            tool_name,
            result.content,
            novel_id=str(ctx.novel_id or (ctx.project or {}).get("id") or ""),
        )
        result = ToolCallResult(
            content=format_input_validation_error(detail),
            is_error=result.is_error,
            context_patch=result.context_patch,
            interaction=result.interaction,
            action=result.action,
            wait_for=result.wait_for,
            end_run=result.end_run,
        )
    result.content = truncate_tool_result(
        map_tool_result_for_model(result),
        max_chars=tool.max_result_size_chars,
    )
    try:
        from app.agent.metrics import record_tool_result

        record_tool_result(tool_name, not result.is_error)
    except Exception:
        pass
    return result
