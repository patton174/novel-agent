"""tool_use_error formatting — thin layer over :mod:`app.agent.tools.errors`."""

from __future__ import annotations

import os
import re

STRUCTURED_OUTPUT_TOOL_NAME = "StructuredOutput"

PLAN_RESULT_TOOL_ALIASES = frozenset(
    {
        "planresult",
        "plan_result",
        STRUCTURED_OUTPUT_TOOL_NAME.lower(),
    }
)

_STEP_RESULT_TOOL_ALIASES = frozenset({"stepresult", "step_result"})

_TOOL_USE_ERROR_RE = re.compile(
    r"<tool_use_error>(.*?)</tool_use_error>",
    re.DOTALL | re.IGNORECASE,
)

_VALIDATION_DETAIL_MARKERS = (
    "field required",
    "validation error",
    "inputvalidationerror",
    "provide chapter_id",
    "provide parent_id",
    "provide chapter_ids",
    "provide at least one",
    "provide memory_id",
    "missing",
)


def max_structured_output_retries() -> int:
    raw = os.environ.get("MAX_STRUCTURED_OUTPUT_RETRIES", "5")
    try:
        value = int(raw)
    except ValueError:
        value = 5
    return max(1, value)


def format_tool_use_error(message: str) -> str:
    body = (message or "").strip()
    if not body:
        body = "Unknown error"
    if _TOOL_USE_ERROR_RE.search(body):
        return body
    return f"<tool_use_error>{body}</tool_use_error>"


def format_no_such_tool_error(tool_name: str) -> str:
    return format_tool_use_error(f"Error: No such tool available: {tool_name}")


def format_wrong_structured_tool_error(wrong_tool: str, schema_name: str) -> str:
    base = format_no_such_tool_error(wrong_tool)
    return (
        f"{base}\n"
        f"You MUST call the {schema_name} tool with arguments that "
        "satisfy the schema exactly."
    )


def format_input_validation_error(detail: str) -> str:
    return format_tool_use_error(f"InputValidationError: {detail}")


def _looks_like_schema_validation(detail: str) -> bool:
    lower = (detail or "").lower()
    return any(marker in lower for marker in _VALIDATION_DETAIL_MARKERS)


def schema_validation_error(tool_name: str, detail: str):
    """Build structured SCHEMA_INVALID for prepare/validation failures."""
    from app.agent.harness.tool_contract import TOOL_CONTRACTS, validation_repair_hint
    from app.agent.tools.errors import ToolError, ToolErrorCode

    tool = (tool_name or "").strip()
    message = (detail or "invalid input").strip()
    if len(message) > 800:
        message = message[:800] + "…"
    hint = validation_repair_hint(tool) if tool in TOOL_CONTRACTS else None
    suggested: list[str] = []
    if tool in TOOL_CONTRACTS:
        suggested.append(tool)
        list_tool = TOOL_CONTRACTS[tool].list_tool
        if list_tool and list_tool not in suggested:
            suggested.append(list_tool)
    return ToolError(
        code=ToolErrorCode.SCHEMA_INVALID,
        message=message,
        hint=hint,
        suggested_tools=suggested,
    )


def schema_validation_tool_result(tool_name: str, detail: str):
    """ToolCallResult for invalid tool input (Pydantic / prepare_tool_input)."""
    from app.agent.tools.errors import tool_error_result

    return tool_error_result(schema_validation_error(tool_name, detail))


def maybe_humanize_tool_error(tool_name: str, detail: str):
    """Upgrade unstructured error text to ToolError when it looks like schema validation."""
    from app.agent.tools.errors import ToolError

    text = (detail or "").strip()
    if not text or "<tool_use_error" in text.lower():
        return None
    if not _looks_like_schema_validation(text):
        return None
    return schema_validation_error(tool_name, text)


def structured_tool_aliases_for(schema_name: str) -> frozenset[str]:
    if schema_name == "PlanResult":
        return PLAN_RESULT_TOOL_ALIASES
    if schema_name == "StepResult":
        return _STEP_RESULT_TOOL_ALIASES
    return frozenset({schema_name.lower()})
