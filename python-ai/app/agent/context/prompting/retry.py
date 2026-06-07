"""Unified retry feedback for structured tool calls."""

from __future__ import annotations

from langchain_core.messages import HumanMessage

from app.agent.harness.tool_errors import format_tool_use_error
from app.agent.context.prompting.blocks import json_block, join_human_blocks
from app.agent.context.prompting.types import RetryContext


def format_retry_dict(
    *,
    attempt: int,
    max_attempts: int,
    error_code: str,
    error_detail: str,
    target_schema: str = "",
    last_payload_hint: str = "",
) -> dict:
    return RetryContext(
        attempt=attempt,
        max_attempts=max_attempts,
        error_code=error_code,
        error_detail=error_detail,
        target_schema=target_schema,
        last_payload_hint=last_payload_hint,
    ).to_dict()


def format_retry_human_message(ctx: RetryContext) -> HumanMessage:
    body = join_human_blocks(
        json_block("RETRY_JSON", ctx.to_dict()),
        (
            f"上次提交未通过（{ctx.error_code}）。"
            f"请严格按 {ctx.target_schema or 'schema'} 再次调用工具，修正：{ctx.error_detail[:500]}"
        ),
    )
    return HumanMessage(content=body)


def structured_retry_human_content(
    *,
    prefix: str,
    attempt: int,
    max_attempts: int,
    detail: str,
    schema_name: str,
) -> str:
    """Structured-output retry line (used by invoke_structured_with_retry)."""
    err_body = format_tool_use_error(
        f"{prefix} (attempt {attempt}/{max_attempts}): {detail}"
    )
    return (
        f"{err_body}\n"
        f"You MUST call the {schema_name} tool again with arguments "
        "that satisfy the schema exactly."
    )
