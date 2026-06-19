"""docx_parser 单测。构造最小 docx（zip）。"""

from __future__ import annotations

import io
import zipfile

from app.parse.docx_parser import parse_docx


def _build_minimal_docx(title: str, paragraphs: list[str]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml",
            '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            '</Types>')
        z.writestr("_rels/.rels",
            '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            '</Relationships>')
        body = "".join(f'<w:p><w:r><w:t>{p}</w:t></w:r></w:p>' for p in paragraphs)
        z.writestr("word/document.xml",
            f'<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            f'<w:body>{body}</w:body></w:document>')
    return buf.getvalue()


def test_parse_docx_extracts_text():
    data = _build_minimal_docx("doc", ["第一章 醒来", "正文内容。"])
    result = parse_docx(data, "a.docx")
    assert result.error is None
    combined = "".join(c.content for c in result.chapters) or result.text
    assert "正文内容" in combined


def test_parse_docx_bad_zip():
    result = parse_docx(b"not zip", "bad.docx")
    assert result.error == "parse_failed"
