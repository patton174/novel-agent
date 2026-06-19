"""pdf_parser 单测。"""

from __future__ import annotations

from app.parse.pdf_parser import parse_pdf


def test_parse_pdf_scan_unsupported_when_no_text(monkeypatch):
    # 模拟扫描型：提取文本为空
    class _FakePage:
        def extract_text(self):
            return ""
    class _FakeReader:
        pages = [_FakePage(), _FakePage()]
    monkeypatch.setattr("app.parse.pdf_parser._build_reader", lambda raw: _FakeReader())
    result = parse_pdf(b"fake", "scan.pdf")
    assert result.error == "pdf_scan_unsupported"


def test_parse_pdf_text_type_extracts(monkeypatch):
    class _FakePage:
        def extract_text(self):
            return "第一章 醒来\n正文段落。"
    class _FakeReader:
        pages = [_FakePage()]
    monkeypatch.setattr("app.parse.pdf_parser._build_reader", lambda raw: _FakeReader())
    result = parse_pdf(b"fake", "a.pdf")
    assert result.error is None
    # 文本型 pdf 切章或单章
    assert result.chapters or result.text
