"""Tool-call markup must not pass into visible chapter text."""

from app.runtime.text_sanitize import extract_visible_text, strip_tool_call_markup


def test_strip_tool_call_markup():
    raw = (
        "正在调用 chapter_list\n"
        "<minimax:tool_call>\n"
        '<invoke name="chapter_list">\n'
        "</invoke>\n"
        "</minimax:tool_call>"
    )
    assert strip_tool_call_markup(raw) == ""


def test_extract_visible_text_strips_tool_blocks():
    raw = "　　开篇。\n<minimax:tool_call></minimax:tool_call>\n　　续写。"
    assert "tool_call" not in extract_visible_text(raw)
    assert "开篇" in extract_visible_text(raw)
