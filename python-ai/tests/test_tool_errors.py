"""tool_use_error humanization."""

from __future__ import annotations

from app.agent.harness.tool_errors import humanize_tool_validation_error


def test_write_missing_file_path_message():
    detail = (
        "1 validation error for WriteInput\nfile_path\n  Field required "
        "[type=missing, input_value={'content': 'hello'}, input_type=dict]"
    )
    msg = humanize_tool_validation_error(
        "Write",
        detail,
        novel_id="d071d83d-a058-441b-ab67-847131d3c69a",
    )
    assert "file_path" in msg
    assert "content" in msg
    assert "d071d83d" in msg


def test_write_index_json_read_only_message():
    detail = (
        "chapters/index.json is read-only (catalog view from Content API, not a file). "
        "To reorder chapters use ReorderChapters"
    )
    msg = humanize_tool_validation_error("Write", detail, novel_id="novel-1")
    assert "ReorderChapters" in msg
    assert "只读" in msg
