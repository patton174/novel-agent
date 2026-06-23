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


def test_sanitize_ai_message_for_history_strips_thinking():
    from langchain_core.messages import AIMessage

    from app.core.llm_content import extract_thinking_text, sanitize_ai_message_for_history

    msg = AIMessage(
        content=[
            {"type": "thinking", "thinking": "内部计划"},
            {"type": "text", "text": "可见正文"},
        ],
        tool_calls=[],
    )
    clean = sanitize_ai_message_for_history(msg)
    assert extract_thinking_text(clean.content) == ""
    assert "可见正文" in str(clean.content)
    assert "内部计划" not in str(clean.content)
