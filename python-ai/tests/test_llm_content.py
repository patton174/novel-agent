"""Tests for Anthropic/MiniMax message content extraction."""

from app.core.llm_content import extract_llm_text


def test_extract_llm_text_anthropic_blocks():
    raw = [
        {"type": "thinking", "thinking": "internal reasoning only"},
        {"type": "text", "text": '{"action":"continue","next_tool":"end"}'},
    ]
    assert "internal reasoning" not in extract_llm_text(raw)
    assert "next_tool" in extract_llm_text(raw)


def test_extract_llm_text_strips_redacted_tags():
    raw = "<think>hidden</think>{\"ok\":true}"
    assert extract_llm_text(raw) == '{"ok":true}'


def test_extract_llm_text_include_thinking():
    raw = [{"type": "thinking", "thinking": "plan step"}]
    assert extract_llm_text(raw, include_thinking=True) == "plan step"
