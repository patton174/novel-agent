"""CC-style in-batch tool execution: log failures, inject retry context, silent re-run."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.agent.schemas import AgentRunContext, StepResult
from app.agent.tools.errors import (
    SILENT_REPAIRABLE_CODES,
    ToolErrorCode,
    extract_error_code,
)

logger = logging.getLogger(__name__)

TOOL_EXECUTION_MAX_ATTEMPTS = 3
TOOL_RETRY_BASE_SEC = 0.4

# Executor events suppressed on retry attempts (frontend keeps first tool.started).
_RETRY_SUPPRESS_EVENT_TYPES = frozenset(
    {
        "step.started",
        "tool.started",
    }
)

_TOOL_START_EVENT_TYPES = frozenset({"step.started", "tool.started"})

_FORWARD_ON_SUCCESSFUL_RETRY = frozenset(
    {
        "tool.completed",
        "step.completed",
        "tool.progress",
        "message.delta",
        "message.started",
        "message.completed",
        "chapter.stream.started",
        "chapter.stream.delta",
        "chapter.stream.completed",
    }
)

_LIVE_TOOL_SSE_TYPES = frozenset(
    {
        "tool.progress",
        "message.delta",
        "message.started",
        "message.completed",
    }
)


def is_live_tool_sse_event(ev: dict[str, Any], *, attempt: int = 1) -> bool:
    """SSE types that must reach the browser while the tool step is still running."""
    et = str(ev.get("type") or "")
    if et.startswith("chapter.stream."):
        return True
    if et in _LIVE_TOOL_SSE_TYPES:
        return True
    # step/tool.started only on first attempt (retries re-emit starts for the executor).
    if attempt == 1 and et in _TOOL_START_EVENT_TYPES:
        return True
    return False


def deferred_tool_step_events_for_ui(
    buffered: list[dict[str, Any]],
    *,
    attempt: int,
    will_retry: bool,
    succeeded: bool,
) -> list[dict[str, Any]]:
    """Lifecycle events after live streaming; skips types already forwarded live."""
    filtered = filter_tool_step_events_for_ui(
        buffered,
        attempt=attempt,
        will_retry=will_retry,
        succeeded=succeeded,
    )
    return [ev for ev in filtered if not is_live_tool_sse_event(ev)]

def _memory_patch_failed(patch: dict[str, Any]) -> tuple[bool, str]:
    for key in ("last_memory_read", "last_memory_patch", "last_memory_delete"):
        blob = patch.get(key)
        if isinstance(blob, dict) and blob.get("ok") is False:
            return True, str(blob.get("reason") or key)
        if isinstance(blob, str) and ("失败" in blob or "missing" in blob.lower()):
            return True, blob[:500]
    return False, ""


def _legacy_error_code_from_text(detail: str) -> str | None:
    """Map unstructured error text to ToolErrorCode (fallback when code= absent)."""
    text = (detail or "").lower()
    if not text.strip():
        return None
    if "old_string not found" in text or ("new_string" in text and "not found" in text):
        return ToolErrorCode.OLD_STRING_NOT_FOUND
    if "not found" in text and ("chapter" in text or "章节" in text):
        return ToolErrorCode.CHAPTER_NOT_FOUND
    if "inputvalidationerror" in text or "field required" in text or "validation error" in text:
        return ToolErrorCode.SCHEMA_INVALID
    if 'code="schema_invalid"' in text:
        return ToolErrorCode.SCHEMA_INVALID
    return None


def classify_tool_step_failure(
    tool: str,
    result: StepResult | None,
    *,
    executor_failed: bool,
    executor_error: str,
) -> tuple[bool, str, str]:
    """Return (is_failure, error_code, error_detail).

    Code-first (P2.3): a structured ``code="…"`` in the error envelope is the
    authoritative error_code; otherwise we fall back to lightweight text mapping.
    """
    if executor_failed:
        err = executor_error or "step failed"
        code = extract_error_code(err) or _legacy_error_code_from_text(err)
        return True, code or "step_exception", err

    if result is None:
        return True, "empty_result", "tool produced no StepResult"

    display = (result.display.content or "").strip()
    structured = extract_error_code(display) or extract_error_code(
        (result.reason or "").strip()
    )
    if structured:
        return True, structured, display or (result.reason or "")

    patch = result.context_patch if isinstance(result.context_patch, dict) else {}
    mem_fail, mem_detail = _memory_patch_failed(patch)
    if mem_fail:
        code = extract_error_code(mem_detail) or _legacy_error_code_from_text(mem_detail)
        return True, code or ToolErrorCode.MEMORY_ITEM_NOT_FOUND, mem_detail

    if display.startswith("缺少"):
        return True, ToolErrorCode.SCHEMA_INVALID, display[:500]

    return False, "", ""


# Loop re-plan recoverable: input-fixable failures the model can correct and retry.
# Deliberately NARROW — codes like CHAPTER_NOT_FOUND / UPSTREAM_5XX / CONFLICT stay
# fatal for the run so a stubborn model can't trigger an unbounded retry storm
# (the structured error still reaches the model via the failed ToolMessage).
_LOOP_RECOVERABLE_CODES = frozenset(
    {
        ToolErrorCode.OLD_STRING_NOT_FOUND,
        ToolErrorCode.SCHEMA_INVALID,
        ToolErrorCode.AMBIGUOUS_TITLE,
        ToolErrorCode.INDEX_OUT_OF_RANGE,
        ToolErrorCode.MEMORY_ITEM_NOT_FOUND,
    }
)


def is_recoverable_tool_execution_failure(error_code: str) -> bool:
    code = (error_code or "").strip()
    return code in _LOOP_RECOVERABLE_CODES or code in ("memory_op", "empty_chapter_body")


def is_silent_tool_retry_eligible(
    tool: str,
    result: StepResult | None,
    *,
    executor_failed: bool,
    executor_error: str,
) -> bool:
    """Input-fixable failures eligible for an in-tool silent LLM repair retry."""
    is_fail, code, _detail = classify_tool_step_failure(
        tool,
        result,
        executor_failed=executor_failed,
        executor_error=executor_error,
    )
    if not is_fail:
        return False
    return (code or "").strip() in SILENT_REPAIRABLE_CODES


def is_failure_sse_event(event: dict[str, Any]) -> bool:
    et = str(event.get("type") or "")
    if et == "step.failed":
        return True
    if et != "tool.completed":
        return False
    payload = event.get("payload")
    if not isinstance(payload, dict):
        return False
    if payload.get("failed") is True or payload.get("status") == "error":
        return True
    content = str(payload.get("content") or payload.get("output") or "")
    return "<tool_use_error>" in content.lower()


def filter_tool_step_events_for_ui(
    buffered: list[dict[str, Any]],
    *,
    attempt: int,
    will_retry: bool,
    succeeded: bool,
) -> list[dict[str, Any]]:
    """Control which SSE events reach the browser during silent tool retries."""
    if succeeded:
        if attempt <= 1:
            return list(buffered)
        out: list[dict[str, Any]] = []
        for ev in buffered:
            et = str(ev.get("type") or "")
            if et in _TOOL_START_EVENT_TYPES or is_failure_sse_event(ev):
                continue
            if et in _FORWARD_ON_SUCCESSFUL_RETRY or et.startswith("chapter.stream."):
                out.append(ev)
        return out

    if will_retry:
        if attempt <= 1:
            return [
                ev
                for ev in buffered
                if str(ev.get("type") or "") in _TOOL_START_EVENT_TYPES
            ]
        return []

    return list(buffered)


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
