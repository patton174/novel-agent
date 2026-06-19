"""Single tool_use execution (CC toolExecution.runToolUse)."""

from __future__ import annotations

from typing import Any

from app.agent.harness.tool_errors import (
    format_no_such_tool_error,
    maybe_humanize_tool_error,
    schema_validation_tool_result,
)
from app.agent.harness.tool_result_routing import map_tool_result_for_model
from app.agent.schemas import AgentRunContext
from app.agent.tools.errors import ToolErrorCode, tool_error_result
from app.agent.tools.errors import ToolError
from app.agent.tools.hooks import run_post_tool_hooks, run_pre_tool_hooks
from app.agent.tools.prepare_tool_input import prepare_tool_input
from app.agent.tools.registry import find_tool_by_name
from app.agent.tools.result_storage import truncate_tool_result
from app.agent.tools.tool import ToolCallResult


def _exception_tool_result(tool_name: str, exc: Exception) -> ToolCallResult:
    return tool_error_result(
        ToolError(
            code=ToolErrorCode.UNKNOWN,
            message=str(exc).strip() or "tool execution failed",
            suggested_tools=[tool_name] if tool_name else [],
        )
    )


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

    raw_input = dict(raw_input or {})
    prepared, prep_err = prepare_tool_input(tool_name, raw_input, ctx)
    if prepared is None:
        return schema_validation_tool_result(tool_name, prep_err or "invalid input")

    parsed = prepared.parsed

    updated_raw, hook_block = await run_pre_tool_hooks(
        tool, tool_use_id, prepared.canonical, ctx
    )
    if hook_block:
        structured = maybe_humanize_tool_error(tool_name, hook_block)
        if structured:
            return tool_error_result(structured)
        return schema_validation_tool_result(tool_name, hook_block)

    if updated_raw != prepared.canonical:
        prepared, prep_err = prepare_tool_input(tool_name, updated_raw, ctx)
        if prepared is None:
            return schema_validation_tool_result(
                tool_name, prep_err or "invalid input after hook"
            )
        parsed = prepared.parsed

    try:
        result = await tool.call(ctx, parsed)
    except Exception as exc:
        return _exception_tool_result(tool_name, exc)

    result = await run_post_tool_hooks(tool, tool_use_id, raw_input, result, ctx)
    if result.is_error and result.content and "<tool_use_error" not in result.content.lower():
        structured = maybe_humanize_tool_error(tool_name, result.content)
        if structured:
            upgraded = tool_error_result(structured)
        else:
            upgraded = tool_error_result(
                ToolError(
                    code=ToolErrorCode.UNKNOWN,
                    message=result.content.strip()[:800],
                    suggested_tools=[tool_name],
                )
            )
        result = ToolCallResult(
            content=upgraded.content,
            is_error=True,
            error=upgraded.error,
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

        err_code = getattr(getattr(result, "error", None), "code", None)
        record_tool_result(tool_name, not result.is_error, error_code=err_code)
    except Exception:
        pass
    return result
