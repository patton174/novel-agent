"""pdf 解析器（仅文本型）。扫描型返回 pdf_scan_unsupported。"""

from __future__ import annotations

import logging
from typing import Callable

from pypdf import PdfReader

from app.parse.models import ParseResult, ParsedChapter
from app.parse.text_parser import _split_chapters

logger = logging.getLogger(__name__)

_SCAN_THRESHOLD = 10  # 每页平均字符低于此视为扫描型


def _build_reader(raw: bytes):
    import io
    return PdfReader(io.BytesIO(raw))


def parse_pdf(raw: bytes, original_name: str, on_progress: Callable[[int], None] | None = None) -> ParseResult:
    title = original_name.rsplit(".", 1)[0]
    try:
        reader = _build_reader(raw)
    except Exception as e:
        return ParseResult(error="parse_failed", detail=str(e))

    pages = reader.pages or []
    total = max(1, len(pages))
    parts: list[str] = []
    for i, p in enumerate(pages):
        parts.append(p.extract_text() or "")
        if on_progress is not None:
            # 按页进度映射到 0..100
            on_progress(int(100 * (i + 1) / total))
    full = "\n".join(parts)
    if pages and len(full) / max(1, len(pages)) < _SCAN_THRESHOLD:
        return ParseResult(error="pdf_scan_unsupported")

    chapters = _split_chapters(full)
    if chapters:
        return ParseResult(
            title=title,
            chapters=[ParsedChapter(title=t, content=c, sort_order=i + 1) for i, (t, c) in enumerate(chapters)],
        )
    return ParseResult(title=title, text=full.strip())
