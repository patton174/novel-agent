"""tool_use_error formatting for model-facing tool results."""

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


def humanize_tool_validation_error(
    tool_name: str,
    detail: str,
    *,
    novel_id: str | None = None,
) -> str:
    """Short, actionable tool_use_error body for common schema mistakes."""
    raw = (detail or "").strip()
    tool = (tool_name or "").strip()
    lower = raw.lower()
    nid = (novel_id or "").strip() or "{novelId}"
    root = f"/novel/{nid}"

    if tool == "Write" and "file_path" in lower and "required" in lower:
        return (
            "Write requires both `file_path` and `content`. "
            f"Example: file_path=\"{root}/chapters/<chapter-uuid>.md\", "
            "content=\"# Title\\n\\nBody…\". "
            "Use RUN_CONTEXT chapter_catalog or Read chapters/index.json for chapter_id; never send content alone."
        )
    if tool in ("Read", "Edit", "Delete") and "file_path" in lower and "required" in lower:
        return (
            f"{tool} requires `file_path` under {root}/ "
            "(e.g. chapters/<uuid>.md or memory/<scope>/<key>.json)."
        )
    if tool in ("Write", "Edit") and "index.json" in lower and "read-only" in lower:
        return (
            "章节目录 chapters/index.json 为只读视图（由作品库生成），不能 Write/Edit。"
            "调序请用 ReorderChapters(chapter_ids=[按阅读顺序的章节 UUID…])；"
            "改正文请用 /chapters/<chapter-uuid>.md。"
        )
    if tool in ("Write", "Edit") and "必须指定章节名" in raw:
        return raw.split("\n\n")[0].strip() or raw[:400]
    if "field required" in lower or "validation error" in lower:
        return raw.replace("validation error for ", "").replace("ValidationError: ", "")
    return raw


def structured_tool_aliases_for(schema_name: str) -> frozenset[str]:
    if schema_name == "PlanResult":
        return PLAN_RESULT_TOOL_ALIASES
    if schema_name == "StepResult":
        return _STEP_RESULT_TOOL_ALIASES
    return frozenset({schema_name.lower()})
