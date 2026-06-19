"""tool_use_error / schema validation helpers."""

from __future__ import annotations

from app.agent.harness.tool_errors import (
    format_no_such_tool_error,
    schema_validation_error,
    schema_validation_tool_result,
)
from app.agent.tools.errors import ToolErrorCode


def test_schema_validation_error_uses_tool_contract():
    err = schema_validation_error(
        "ReadChapter",
        "1 validation error for ReadChapterInput\nchapter_id\n  Field required",
    )
    assert err.code == ToolErrorCode.SCHEMA_INVALID
    assert "chapter_id" in (err.hint or "")
    assert "ReadChapter" in err.suggested_tools
    assert "ListChapters" in err.suggested_tools


def test_schema_validation_tool_result_wraps_envelope():
    result = schema_validation_tool_result("WriteChapter", "Field required: title")
    assert result.is_error
    assert "<tool_use_error" in result.content
    assert 'code="SCHEMA_INVALID"' in result.content
    assert result.error is not None
    assert "title" in (result.error.hint or "")


def test_no_such_tool_error_format():
    text = format_no_such_tool_error("Read")
    assert "No such tool available: Read" in text
    assert text.startswith("<tool_use_error>")
