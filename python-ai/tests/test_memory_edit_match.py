"""EditMemory old_string matching against ReadMemory-formatted snippets."""

from __future__ import annotations

from app.agent.tools.text_edit import resolve_old_string_match, strip_read_line_prefixes


def test_strip_read_memory_line_prefixes():
    raw = "     1\t第一章\n     2\t内容"
    assert strip_read_line_prefixes(raw) == "第一章\n内容"


def test_resolve_old_string_match_accepts_line_numbered_snippet():
    stored = '{\n  "chapter": "第一章"\n}'
    from_read = '     1\t"chapter": "第一章"'
    matched = resolve_old_string_match(stored, from_read)
    assert matched == '"chapter": "第一章"'


def test_resolve_old_string_match_prefers_exact():
    stored = "alpha beta"
    assert resolve_old_string_match(stored, "alpha") == "alpha"
