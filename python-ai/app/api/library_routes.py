"""/internal/library/summarize — 书库书全书摘要（Java LIBRARY_INDEX listener 调）。"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.core.llm import generate_text

logger = logging.getLogger(__name__)

internal_router = APIRouter()

_SYSTEM = "你是小说摘要生成器。根据章节标题与每章首段，生成该书 150 字以内的内容简介，直接输出摘要，不要多余解释。"
_PROMPT = """章节标题：
{titles}

各章首段：
{chunks}

请生成全书摘要。"""


def _verify_internal_key(key: str | None) -> None:
    expected = settings.internal_service_key
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="invalid internal service key")


class SummarizeRequest(BaseModel):
    catalogNovelId: str | None = None
    chapterTitles: list[str] = []
    firstChunks: list[str] = []


@internal_router.post("/library/summarize")
async def summarize(
    body: SummarizeRequest,
    x_internal_service_key: str | None = Header(default=None, alias="X-Internal-Service-Key"),
):
    _verify_internal_key(x_internal_service_key)
    titles = "\n".join(body.chapterTitles[:50]) or "（无）"
    chunks = "\n".join(body.firstChunks[:50]) or "（无）"
    try:
        summary = await generate_text(
            _PROMPT.format(titles=titles, chunks=chunks),
            system_message=_SYSTEM,
            temperature=0.3,
        )
        return {"summary": (summary or "").strip()}
    except Exception as e:
        logger.warning("library summarize failed: %s", e)
        return {"summary": "", "error": str(e)}
