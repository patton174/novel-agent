"""Phase 0 foundation tests (AGENT_REFACTOR_PLAN §Phase 0).

Covers:
  - ToolError serialization protocol (P0.2)
  - metrics dimensions: error_code / is_final / attempt + final_failure_rate (P0.1)
  - AGENT_RF_* feature flags default off (P0.4)
"""

from __future__ import annotations

from app.agent.metrics import (
    final_failure_rate,
    record_tool_result,
    reset,
    snapshot,
)
from app.agent.tools.errors import ToolError, ToolErrorCode


def test_tool_error_serialization_minimal():
    err = ToolError(code=ToolErrorCode.CHAPTER_NOT_FOUND, message="no such chapter")
    out = err.to_tool_use_error()
    assert out == (
        '<tool_use_error code="CHAPTER_NOT_FOUND">no such chapter</tool_use_error>'
    )


def test_tool_error_serialization_full():
    err = ToolError(
        code=ToolErrorCode.OLD_STRING_NOT_FOUND,
        message="old_string not found",
        hint="ReadChapter(chapter_id) first",
        suggested_tools=["ReadChapter", "EditChapter"],
        retryable=True,
    )
    out = err.to_tool_use_error()
    assert 'code="OLD_STRING_NOT_FOUND"' in out
    assert 'hint="ReadChapter(chapter_id) first"' in out
    assert 'suggested_tools="ReadChapter,EditChapter"' in out
    assert 'retryable="true"' in out
    assert out.endswith("old_string not found</tool_use_error>")


def test_tool_error_escapes_quotes():
    err = ToolError(code=ToolErrorCode.AMBIGUOUS_TITLE, message="x", hint='say "hi"')
    out = err.to_tool_use_error()
    assert "&quot;hi&quot;" in out


def test_tool_error_code_is_known():
    assert ToolErrorCode.is_known(ToolErrorCode.SCHEMA_INVALID)
    assert not ToolErrorCode.is_known("NOPE")


def test_metrics_backward_compatible():
    reset()
    record_tool_result("ReadChapter", True)
    record_tool_result("ReadChapter", False)
    snap = snapshot()
    assert snap["ReadChapter"]["ok"] == 1
    assert snap["ReadChapter"]["error"] == 1


def test_metrics_error_code_dimension():
    reset()
    record_tool_result("EditChapter", False, error_code=ToolErrorCode.OLD_STRING_NOT_FOUND)
    record_tool_result("EditChapter", False, error_code=ToolErrorCode.OLD_STRING_NOT_FOUND)
    record_tool_result("EditChapter", False, error_code=ToolErrorCode.CHAPTER_NOT_FOUND)
    snap = snapshot()["EditChapter"]
    assert snap["error"] == 3
    assert snap["by_code"]["OLD_STRING_NOT_FOUND"] == 2
    assert snap["by_code"]["CHAPTER_NOT_FOUND"] == 1


def test_metrics_intermediate_retries_not_counted_as_failure():
    reset()
    # two silent retries then a final success
    record_tool_result("WriteChapter", False, is_final=False, attempt=1)
    record_tool_result("WriteChapter", False, is_final=False, attempt=2)
    record_tool_result("WriteChapter", True, is_final=True, attempt=3)
    snap = snapshot()["WriteChapter"]
    assert snap["ok"] == 1
    assert snap["error"] == 0
    assert snap["retries"] == 2
    assert snap["attempts"] == {"1": 1, "2": 1, "3": 1}
    assert final_failure_rate("WriteChapter") == 0.0


def test_metrics_final_failure_rate():
    reset()
    record_tool_result("T", True)
    record_tool_result("T", True)
    record_tool_result("T", False, error_code="UPSTREAM_5XX")
    assert final_failure_rate("T") == 1 / 3
    assert final_failure_rate() == 1 / 3
    assert final_failure_rate("missing") == 0.0


def test_feature_flags_default_off():
    from app.config import Settings

    s = Settings()
    assert s.agent_rf_stream_truth is False
    assert s.agent_rf_catalog_version is False
    assert s.agent_rf_agent_serial is False
    assert s.agent_rf_error_protocol is False
    assert s.agent_rf_new_timeline is False


def test_feature_flags_env_override(monkeypatch):
    from app.config import Settings

    monkeypatch.setenv("AGENT_RF_STREAM_TRUTH", "true")
    s = Settings()
    assert s.agent_rf_stream_truth is True
