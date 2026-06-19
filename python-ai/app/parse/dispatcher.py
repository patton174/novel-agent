"""格式分发 + 进度写 Redis。"""

from __future__ import annotations

import logging

from app.core.redis_client import set_parse_progress
from app.parse.docx_parser import parse_docx
from app.parse.epub_parser import parse_epub
from app.parse.models import ParseResult
from app.parse.pdf_parser import parse_pdf
from app.parse.text_parser import parse_text

logger = logging.getLogger(__name__)

# parse_text 签名为 (raw, fmt, original_name)（需要 fmt 决定是否剥 md 标记），
# 其余解析器为 (raw, original_name)。用 lambda 适配为统一的 (raw, original_name) 调用。
_PARSERS = {
    "txt": lambda raw, name: parse_text(raw, "txt", name),
    "md": lambda raw, name: parse_text(raw, "md", name),
    "epub": parse_epub,
    "pdf": parse_pdf,
    "docx": parse_docx,
}


def dispatch(file_id: str, raw: bytes, fmt: str, original_name: str) -> ParseResult:
    set_parse_progress(file_id, 5)
    parser = _PARSERS.get(fmt)
    if parser is None:
        return ParseResult(error="unsupported_format", detail=fmt)
    set_parse_progress(file_id, 20)
    try:
        result = parser(raw, original_name)
    except Exception as e:
        logger.warning("parse dispatch failed fmt=%s err=%s", fmt, e)
        return ParseResult(error="parse_failed", detail=str(e))
    set_parse_progress(file_id, 80)
    return result
