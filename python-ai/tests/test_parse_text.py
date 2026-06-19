"""text_parser 单测。"""

from __future__ import annotations

from app.parse.text_parser import parse_text


def test_parse_txt_plain():
    result = parse_text("第一章 醒来\n\n正文内容。".encode("utf-8"), "txt", "醒.txt")
    assert result.error is None
    # title 取自 original_name 去扩展名（与 epub/pdf/docx 解析器一致）
    assert result.title == "醒"
    assert result.chapters
    assert "正文内容" in result.chapters[0].content


def test_parse_md_strips_markup():
    md = "# 标题\n\n**粗体** 普通文本".encode("utf-8")
    result = parse_text(md, "md", "a.md")
    assert result.error is None
    assert "粗体" in result.text or any("粗体" in c.content for c in result.chapters)
    assert "#" not in (result.text or "".join(c.content for c in result.chapters))


def test_parse_invalid_encoding():
    # 非 utf-8 字节不应崩，应尽力返回
    result = parse_text(b"\xff\xfe\x00", "txt", "a.txt")
    # 不报错即可
    assert result.error is None
