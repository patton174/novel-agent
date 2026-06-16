"""CC-style in-batch tool execution: log failures, inject retry context, silent re-run."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.agent.schemas import AgentRunContext, StepResult

logger = logging.getLogger(__name__)

TOOL_EXECUTION_MAX_ATTEMPTS = 3
TOOL_RETRY_BASE_SEC = 0.4

RETRYABLE_TOOLS = frozenset(
    {
        "Read",
        "Write",
        "Edit",
        "Glob",
        "Grep",
        "Delete",
        "WebFetch",
        "WebSearch",
    }
)

# Executor events suppressed on retry attempts (frontend keeps first tool.started).
_RETRY_SUPPRESS_EVENT_TYPES = frozenset(
    {
        "step.started",
        "tool.started",
    }
)

# step_kind / reason tokens that mean validation or IO failed (not a successful wait).
# Validation failures before tool LLM — retry cannot fix missing resolved fields.
_NON_RETRYABLE_VALIDATION_REASONS = frozenset(
    {
        "chapter_create missing title",
        "chapter_update missing chapter_id",
        "chapter_update missing fields",
        "chapter_read missing chapter_id",
        "memory fields missing",
        "memory fields invalid",
        "memory read missing scope",
        "missing fields",
    }
)

_TOOL_FAILURE_REASONS = frozenset(
    {
        "chapter_create missing title",
        "chapter_update missing chapter_id",
        "chapter_update missing fields",
        "chapter_update empty patch",
        "chapter_read missing chapter_id",
        "chapter_read not found",
        "chapter_delete missing chapter_id",
        "memory fields missing",
        "memory fields invalid",
        "memory key exists",
        "memory read missing scope",
        "missing fields",
    }
)


def _memory_patch_failed(patch: dict[str, Any]) -> tuple[bool, str]:
    for key in ("last_memory_read", "last_memory_patch", "last_memory_delete"):
        blob = patch.get(key)
        if isinstance(blob, dict) and blob.get("ok") is False:
            return True, str(blob.get("reason") or key)
        if isinstance(blob, str) and ("失败" in blob or "missing" in blob.lower()):
            return True, blob[:500]
    return False, ""


def _is_vfs_input_error(detail: str) -> bool:
    text = (detail or "").lower()
    return (
        "does not match run novel" in text
        or "path must be under /novel/" in text
        or "{novelid}" in text
        or "invalid path" in text
    )


def _is_recoverable_input_validation(detail: str) -> bool:
    text = (detail or "").lower()
    return "inputvalidationerror" in text or "field required" in text


def _is_chapter_title_validation_error(detail: str) -> bool:
    text = (detail or "").strip()
    if not text:
        return False
    markers = (
        "章节 Write/Edit 必须指定章节名",
        "章节名不能使用",
        "frontmatter",
        "YAML frontmatter",
    )
    return any(m in text for m in markers)


def classify_tool_step_failure(
    tool: str,
    result: StepResult | None,
    *,
    executor_failed: bool,
    executor_error: str,
) -> tuple[bool, str, str]:
    """Return (is_failure, error_code, error_detail)."""
    if executor_failed:
        err = executor_error or "step failed"
        err_lower = err.lower()
        if "old_string not found" in err_lower or "new_string" in err_lower and "not found" in err_lower:
            return True, "tool_validation", err
        if _is_vfs_input_error(err):
            return True, "vfs_input", err
        if _is_chapter_title_validation_error(err):
            return True, "tool_validation", err
        if _is_recoverable_input_validation(err):
            return True, "tool_validation", err
        return True, "step_exception", err

    if result is None:
        return True, "empty_result", "tool produced no StepResult"

    reason = (result.reason or "").strip()
    if reason in _TOOL_FAILURE_REASONS:
        return True, "tool_validation", reason

    display = (result.display.content or "").strip()
    if display.startswith("缺少") or display.startswith("缺少必填"):
        return True, "tool_validation", display[:500]

    patch = result.context_patch if isinstance(result.context_patch, dict) else {}
    mem_fail, mem_detail = _memory_patch_failed(patch)
    if mem_fail:
        return True, "memory_op", mem_detail

    if tool in ("chapter_create", "chapter_update"):
        body = patch.get("chapter_create") or patch.get("chapter_update")
        if isinstance(body, dict):
            content = str(body.get("content") or "").strip()
            if not content and reason in ("chapter create", "chapter update"):
                return True, "empty_chapter_body", "chapter body is empty after generation"

    return False, "", ""


_LLM_STREAM_RETRY_TOOLS = frozenset(
    {"chapter_create", "chapter_update", "output", "ask_user", "choose"}
)


# Failures the main loop can feed back via ToolMessage and re-plan (not run.terminal).
RECOVERABLE_TOOL_ERROR_CODES = frozenset(
    {
        "tool_validation",
        "vfs_input",
        "memory_op",
        "empty_chapter_body",
    }
)


def is_recoverable_tool_execution_failure(error_code: str) -> bool:
    return (error_code or "").strip() in RECOVERABLE_TOOL_ERROR_CODES


def is_tool_failure_retryable(
    tool: str,
    result: StepResult | None,
    *,
    executor_failed: bool,
    executor_error: str,
) -> bool:
    """Only stream/LLM tools benefit from in-batch retry with TOOL_RETRY_JSON."""
    is_fail, _code, _detail = classify_tool_step_failure(
        tool, result, executor_failed=executor_failed, executor_error=executor_error
    )
    if not is_fail or tool not in _LLM_STREAM_RETRY_TOOLS:
        return False
    reason = (result.reason or "").strip() if result else ""
    return reason not in _NON_RETRYABLE_VALIDATION_REASONS


def prepare_tool_retry_input(
    tool: str,
    tool_input: dict[str, Any],
    *,
    error_code: str,
    error_detail: str,
    attempt: int,
) -> dict[str, Any]:
    inp = dict(tool_input or {})
    inp.pop("_tool_retry", None)
    inp["_tool_retry"] = {
        "tool": tool,
        "attempt": attempt,
        "error_code": error_code,
        "error_detail": (error_detail or "")[:800],
    }
    return inp


def merge_tool_retry_context(
    ctx: AgentRunContext,
    tool: str,
    *,
    error_code: str,
    error_detail: str,
    attempt: int,
) -> AgentRunContext:
    patch = dict(ctx.context_patch or {})
    patch["tool_retry"] = {
        "tool": tool,
        "attempt": attempt,
        "error_code": error_code,
        "error_detail": (error_detail or "")[:800],
    }
    return ctx.model_copy(update={"context_patch": patch})


def tool_retry_sleep(attempt: int) -> float:
    if attempt <= 1:
        return 0.0
    return TOOL_RETRY_BASE_SEC * (attempt - 1)


async def tool_retry_delay(attempt: int) -> None:
    delay = tool_retry_sleep(attempt)
    if delay > 0:
        await asyncio.sleep(delay)
