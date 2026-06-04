"""CC-style business tool retry helpers."""

from __future__ import annotations

from app.agent_step.schemas import DisplayPayload, StepResult
from app.agent_step.tool_execution import (
    classify_tool_step_failure,
    is_tool_failure_retryable,
    prepare_tool_retry_input,
)


def test_classify_missing_title_as_failure():
    result = StepResult(
        step_kind="chapter_create",
        action="continue",
        next_input={},
        context_patch={},
        display=DisplayPayload(type="tool", tool="chapter_create", content="缺少必填参数 title。"),
        reason="chapter_create missing title",
    )
    fail, code, _ = classify_tool_step_failure(
        "chapter_create", result, executor_failed=False, executor_error=""
    )
    assert fail is True
    assert code == "tool_validation"


def test_classify_memory_patch_ok_false():
    result = StepResult(
        step_kind="memory_patch",
        action="continue",
        next_input={},
        display=DisplayPayload(type="tool", tool="memory_patch", content="ok"),
        reason="memory updated",
        context_patch={"last_memory_patch": {"ok": False, "reason": "memory key exists"}},
    )
    fail, code, detail = classify_tool_step_failure(
        "memory_patch", result, executor_failed=False, executor_error=""
    )
    assert fail is True
    assert code == "memory_op"
    assert "exists" in detail


def test_missing_title_not_retryable():
    result = StepResult(
        step_kind="chapter_create",
        action="continue",
        next_input={},
        context_patch={},
        display=DisplayPayload(type="tool", tool="chapter_create", content="缺少必填参数 title。"),
        reason="chapter_create missing title",
    )
    assert (
        is_tool_failure_retryable(
            "chapter_create", result, executor_failed=False, executor_error=""
        )
        is False
    )


def test_write_chapter_title_executor_error_is_recoverable_validation():
    msg = (
        "章节 Write/Edit 必须指定章节名：在正文前添加 YAML frontmatter，例如\n"
        "---\ntitle: 第一章 雨中\n---"
    )
    fail, code, _ = classify_tool_step_failure(
        "Write", None, executor_failed=True, executor_error=msg
    )
    assert fail is True
    assert code == "tool_validation"


def test_prepare_tool_retry_injects_block_without_mutating_fields():
    inp = prepare_tool_retry_input(
        "chapter_create",
        {"task": "写第二章"},
        error_code="tool_validation",
        error_detail="缺少 title",
        attempt=2,
    )
    retry = inp.get("_tool_retry")
    assert isinstance(retry, dict)
    assert retry.get("attempt") == 2
    assert retry.get("error_detail") == "缺少 title"
    assert "title" not in inp
