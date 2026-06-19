"""Tests for shared text edit matching and chapter resolution."""

from __future__ import annotations

from app.agent.tools.chapter_resolve import resolve_chapter_row
from app.agent.tools.text_edit import (
    apply_string_replace,
    resolve_old_string_match,
    should_fallback_full_body_replace,
    strip_read_line_prefixes,
)


def test_strip_read_line_prefixes():
    raw = "     1\t第一章\n     2\t内容"
    assert strip_read_line_prefixes(raw) == "第一章\n内容"


def test_resolve_old_string_match_accepts_line_numbered_snippet():
    stored = "第一章\n正文段落"
    from_read = "     1\t第一章\n     2\t正文段落"
    matched = resolve_old_string_match(stored, from_read)
    assert matched == "第一章\n正文段落"


def test_resolve_old_string_match_prefers_exact():
    stored = "alpha beta"
    assert resolve_old_string_match(stored, "alpha") == "alpha"


def test_apply_string_replace_full_body_when_old_empty():
    stored = "old body"
    new_text, err = apply_string_replace(stored, "", "new body")
    assert err is None
    assert new_text == "new body"


def test_should_fallback_full_body_replace_for_long_rewrite():
    body = "a" * 1000
    assert should_fallback_full_body_replace(body, "missing snippet", "b" * 600) is True
    assert should_fallback_full_body_replace(body, "missing snippet", "tiny fix") is False


def test_resolve_chapter_row_by_index():
    rows = [
        {"id": "aaa", "title": "开篇", "sort_order": 1, "list_index": 1},
        {"id": "bbb", "title": "转折", "sort_order": 2, "list_index": 2},
    ]
    row, err = resolve_chapter_row(rows, index=2)
    assert err is None
    assert row is not None
    assert row["id"] == "bbb"


def test_resolve_chapter_row_title_when_id_is_title():
    rows = [{"id": "aaa", "title": "开篇", "sort_order": 1, "list_index": 1}]
    row, err = resolve_chapter_row(rows, chapter_id="开篇")
    assert err is None
    assert row is not None
    assert row["id"] == "aaa"
