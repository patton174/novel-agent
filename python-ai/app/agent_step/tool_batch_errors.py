"""Per-tool_call_id error ToolMessages for main loop validation (CC-style)."""

from __future__ import annotations

from langchain_core.messages import ToolMessage

from app.agent_step.tool_errors import (
    format_input_validation_error,
    format_no_such_tool_error,
)


def append_tool_messages_for_detail(
    messages: list,
    tool_call_ids: list[str],
    detail: str,
    *,
    is_no_such_tool: bool = False,
) -> None:
    formatter = format_no_such_tool_error if is_no_such_tool else format_input_validation_error
    body = formatter(detail)
    for tid in tool_call_ids:
        if not tid:
            continue
        messages.append(ToolMessage(content=body, tool_call_id=tid))


def append_unknown_tool_errors(
    messages: list,
    ai_calls: list,
    *,
    allowed_tools: frozenset[str],
) -> None:
    for item in ai_calls:
        tool = (item.call.tool or "").strip()
        if tool in allowed_tools:
            body = format_input_validation_error(
                "本批含未注册工具，请移除非法 tool_use 后重试。"
            )
        else:
            body = format_no_such_tool_error(tool)
        messages.append(
            ToolMessage(content=body, tool_call_id=item.tool_call_id)
        )


def append_batch_validation_errors(
    messages: list,
    tool_call_ids: list[str],
    detail: str,
) -> None:
    append_tool_messages_for_detail(messages, tool_call_ids, detail)
