"""格式分发 + 实时进度写 Redis + 完成回调 Java。

解析在后台线程执行（parse_routes 用 BackgroundTasks 触发），此处同步推进：
- 进度按章节/页实时写 Redis（key parse:progress:{file_id}），前端轮询可见。
- 解析完成（含异常）回调 Java /internal/upload/{file_id}/finalize 交付结果。
"""

from __future__ import annotations

import logging
from typing import Callable

import httpx

from app.config import settings
from app.core.redis_client import set_parse_progress
from app.parse.docx_parser import parse_docx
from app.parse.epub_parser import parse_epub
from app.parse.models import ParseResult
from app.parse.pdf_parser import parse_pdf
from app.parse.text_parser import parse_text

logger = logging.getLogger(__name__)

# 进度区间：5（开始）→ 20（已选解析器）→ 解析中 20..80 → 99（回调成功）→ 100（Java finalize 置 ready 时）。
_PROGRESS_START = 5
_PROGRESS_PARSER_READY = 20
_PROGRESS_PARSE_DONE = 80
_PROGRESS_CALLBACK_DONE = 99

# parse_text 签名为 (raw, fmt, original_name)（无章节循环，秒级完成，不需细粒度进度）；
# 其余解析器签名为 (raw, original_name, on_progress)。用 lambda 适配为统一三参调用。
_PARSERS: dict[str, Callable] = {
    "txt": lambda raw, name, cb: parse_text(raw, "txt", name),
    "md": lambda raw, name, cb: parse_text(raw, "md", name),
    "epub": parse_epub,
    "pdf": parse_pdf,
    "docx": parse_docx,
}


def dispatch(file_id: str, raw: bytes, fmt: str, original_name: str) -> ParseResult:
    """同步解析并写进度。由后台任务调用，结果交回调 Java。"""
    set_parse_progress(file_id, _PROGRESS_START)
    parser = _PARSERS.get(fmt)
    if parser is None:
        return ParseResult(error="unsupported_format", detail=fmt)
    set_parse_progress(file_id, _PROGRESS_PARSER_READY)

    def on_progress(pct: int) -> None:
        # 解析器内部进度（0..100）映射到 [20, 80] 区间
        clamped = max(_PROGRESS_PARSER_READY, min(_PROGRESS_PARSE_DONE, pct))
        set_parse_progress(file_id, clamped)

    try:
        result = parser(raw, original_name, on_progress)
    except Exception as e:  # 解析器未捕获异常 → 包装为 parse_failed
        logger.warning("parse dispatch failed fmt=%s err=%s", fmt, e)
        result = ParseResult(error="parse_failed", detail=str(e))
    set_parse_progress(file_id, _PROGRESS_PARSE_DONE)
    return result


def _callback_java(file_id: str, result: ParseResult) -> None:
    """解析完成回调 Java /internal/upload/{file_id}/finalize 交付结果（含 error）。"""
    url = f"{settings.content_base_url.rstrip('/')}/internal/upload/{file_id}/finalize"
    try:
        # finalize 落库可能很慢（数千章批量插入），给足超时避免 Java 实际成功但响应超时被误判失败。
        with httpx.Client(timeout=120.0) as client:
            resp = client.post(
                url,
                json=result.model_dump(),
                headers={"X-Internal-Service-Key": settings.internal_service_key},
            )
        if resp.status_code >= 300:
            logger.warning("finalize callback non-2xx fileId=%s status=%s body=%s",
                           file_id, resp.status_code, resp.text[:200])
        else:
            set_parse_progress(file_id, _PROGRESS_CALLBACK_DONE)
    except Exception as e:
        # 回调失败不重试；Java 兜底调度会将超时的 parsing 置 failed。
        logger.warning("finalize callback failed fileId=%s err=%s", file_id, e)


def run_parse(file_id: str, raw: bytes, fmt: str, original_name: str) -> None:
    """后台任务入口：解析 → 回调 Java。任何异常都被吸收，避免任务静默死亡。"""
    try:
        result = dispatch(file_id, raw, fmt, original_name)
    except Exception as e:  # 兜底：dispatch 自身异常
        logger.exception("dispatch crashed fileId=%s err=%s", file_id, e)
        result = ParseResult(error="parse_failed", detail=f"dispatch crashed: {e}")
    _callback_java(file_id, result)
