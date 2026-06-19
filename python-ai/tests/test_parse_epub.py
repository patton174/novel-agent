"""epub_parser 单测。用代码构造最小合法 epub。"""

from __future__ import annotations

import io
import zipfile

from app.parse.epub_parser import parse_epub


def _build_minimal_epub(title: str, chapters: list[tuple[str, str]]) -> bytes:
    """构造一个最小合法 epub（zip）。"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("mimetype", "application/epub+zip")
        z.writestr("META-INF/container.xml",
            '<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
            '<rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>'
            '</rootfiles></container>')
        items = ""
        itemrefs = ""
        for i, (t, c) in enumerate(chapters):
            fname = f"ch{i+1}.xhtml"
            html = f'<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>{t}</title></head><body><h1>{t}</h1><p>{c}</p></body></html>'
            z.writestr(fname, html)
            items += f'<item id="ch{i+1}" href="{fname}" media-type="application/xhtml+xml"/>'
            itemrefs += f'<itemref idref="ch{i+1}"/>'
        z.writestr("content.opf",
            f'<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0">'
            f'<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>{title}</dc:title></metadata>'
            f'<manifest>{items}</manifest><spine>{itemrefs}</spine></package>')
    return buf.getvalue()


def test_parse_epub_extracts_chapters():
    data = _build_minimal_epub("测试书", [("第一章", "内容一"), ("第二章", "内容二")])
    result = parse_epub(data, "test.epub")
    assert result.error is None
    assert len(result.chapters) == 2
    assert "内容一" in result.chapters[0].content
    assert result.chapters[1].sort_order == 2


def test_parse_epub_bad_zip_returns_error():
    result = parse_epub(b"not a zip", "bad.epub")
    assert result.error == "parse_failed"
