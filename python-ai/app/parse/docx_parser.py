"""docx 解析器：zipfile + ET 提取 <w:t>。"""

from __future__ import annotations

import io
import logging
import zipfile
from xml.etree import ElementTree as ET

from app.parse.models import ParseResult, ParsedChapter
from app.parse.text_parser import _split_chapters

logger = logging.getLogger(__name__)

_W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def parse_docx(raw: bytes, original_name: str) -> ParseResult:
    title = original_name.rsplit(".", 1)[0]
    try:
        zf = zipfile.ZipFile(io.BytesIO(raw))
        xml = zf.read("word/document.xml")
    except (zipfile.BadZipFile, KeyError) as e:
        return ParseResult(error="parse_failed", detail=str(e))

    try:
        root = ET.fromstring(xml)
        paragraphs = []
        for p in root.iter(f"{_W}p"):
            texts = [t.text or "" for t in p.iter(f"{_W}t")]
            line = "".join(texts).strip()
            if line:
                paragraphs.append(line)
        full = "\n".join(paragraphs)
        chapters = _split_chapters(full)
        if chapters:
            return ParseResult(
                title=title,
                chapters=[ParsedChapter(title=t, content=c, sort_order=i + 1) for i, (t, c) in enumerate(chapters)],
            )
        return ParseResult(title=title, text=full)
    except Exception as e:
        logger.warning("docx parse failed: %s", e)
        return ParseResult(error="parse_failed", detail=str(e))
