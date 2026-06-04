from app.runtime.text_sanitize import strip_line_leading_fullwidth_indent


def test_strip_line_leading_fullwidth_indent():
    assert strip_line_leading_fullwidth_indent("　　你好") == "你好"
    assert strip_line_leading_fullwidth_indent("第一段\n　　第二段") == "第一段\n第二段"
