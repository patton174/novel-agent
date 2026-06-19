"""Tool failure classification + retry helpers (AGENT_REFACTOR_PLAN P2.3, code-based)."""

from __future__ import annotations

from app.agent.harness.tool_execution import (
    classify_tool_step_failure,
    is_recoverable_tool_execution_failure,
    is_silent_tool_retry_eligible,
    prepare_tool_retry_input,
)
from app.agent.schemas import DisplayPayload, StepResult
from app.agent.tools.errors import ToolError, ToolErrorCode


def test_classify_structured_code_from_envelope():
    err = ToolError(
        code=ToolErrorCode.CHAPTER_NOT_FOUND, message="chapter not found"
    ).to_tool_use_error()
    fail, code, _ = classify_tool_step_failure(
        "EditChapter", None, executor_failed=True, executor_error=err
    )
    assert fail is True
    assert code == ToolErrorCode.CHAPTER_NOT_FOUND
    assert not is_recoverable_tool_execution_failure(code)


def test_old_string_not_found_is_loop_recoverable():
    err = ToolError(
        code=ToolErrorCode.OLD_STRING_NOT_FOUND, message="old_string not found"
    ).to_tool_use_error()
    fail, code, _ = classify_tool_step_failure(
        "EditChapter", None, executor_failed=True, executor_error=err
    )
    assert fail is True
    assert code == ToolErrorCode.OLD_STRING_NOT_FOUND
    assert is_recoverable_tool_execution_failure(code)


def test_classify_memory_patch_ok_false_is_recoverable():
    result = StepResult(
        step_kind="UpdateMemoryContent",
        action="continue",
        next_input={},
        display=DisplayPayload(type="tool", tool="UpdateMemoryContent", content="ok"),
        reason="memory updated",
        context_patch={"last_memory_patch": {"ok": False, "reason": "memory node not found"}},
    )
    fail, code, detail = classify_tool_step_failure(
        "UpdateMemoryContent", result, executor_failed=False, executor_error=""
    )
    assert fail is True
    assert is_recoverable_tool_execution_failure(code)
    assert "not found" in detail


def test_schema_invalid_is_silent_repairable():
    err = ToolError(
        code=ToolErrorCode.SCHEMA_INVALID, message="bad payload"
    ).to_tool_use_error()
    assert is_silent_tool_retry_eligible(
        "WriteChapter", None, executor_failed=True, executor_error=err
    )


def test_upstream_5xx_is_fatal_and_not_silent_repairable():
    err = ToolError(
        code=ToolErrorCode.UPSTREAM_5XX, message="HTTP 500", retryable=True
    ).to_tool_use_error()
    fail, code, _ = classify_tool_step_failure(
        "EditChapter", None, executor_failed=True, executor_error=err
    )
    assert fail and code == ToolErrorCode.UPSTREAM_5XX
    assert not is_recoverable_tool_execution_failure(code)
    assert not is_silent_tool_retry_eligible(
        "EditChapter", None, executor_failed=True, executor_error=err
    )


def test_schema_invalid_text_maps_to_code():
    err = ToolError(
        code=ToolErrorCode.SCHEMA_INVALID,
        message="Field required: title",
        hint="`title` required; `content` must be empty (stream-only).",
    ).to_tool_use_error()
    fail, code, _ = classify_tool_step_failure(
        "WriteChapter", None, executor_failed=True, executor_error=err
    )
    assert fail is True
    assert code == ToolErrorCode.SCHEMA_INVALID
    assert is_recoverable_tool_execution_failure(code)


def test_prepare_tool_retry_injects_block_without_mutating_fields():
    inp = prepare_tool_retry_input(
        "WriteChapter",
        {"task": "写第二章"},
        error_code=ToolErrorCode.SCHEMA_INVALID,
        error_detail="缺少 title",
        attempt=2,
    )
    retry = inp.get("_tool_retry")
    assert isinstance(retry, dict)
    assert retry.get("attempt") == 2
    assert retry.get("error_detail") == "缺少 title"
    assert "title" not in inp


def test_legacy_old_string_text_maps_to_code():
    fail, code, _ = classify_tool_step_failure(
        "EditChapter",
        None,
        executor_failed=True,
        executor_error="<tool_use_error>old_string not found</tool_use_error>",
    )
    assert fail is True
    assert code == ToolErrorCode.OLD_STRING_NOT_FOUND
