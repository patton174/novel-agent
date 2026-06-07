"""RAG index ingest with retry — unified entry for MQ / HTTP callers."""

from __future__ import annotations

import asyncio
import logging

from app.config import settings
from app.rag.chapter_index import index_chapter

logger = logging.getLogger(__name__)

_BASE_DELAY_SEC = 0.4


async def _do_index(
    *,
    novel_id: str,
    chapter_id: str,
    title: str,
    content: str,
    summary: str | None = None,
) -> int:
    return await index_chapter(
        novel_id=novel_id,
        chapter_id=chapter_id,
        title=title,
        content=content,
        summary=summary,
    )


async def index_with_retry(
    *,
    novel_id: str,
    chapter_id: str,
    title: str,
    content: str,
    summary: str | None = None,
    max_attempts: int = 3,
) -> int:
    """Index chapter chunks with exponential backoff on transient failures."""
    last_exc: Exception | None = None
    for attempt in range(1, max(1, max_attempts) + 1):
        try:
            count = await _do_index(
                novel_id=novel_id,
                chapter_id=chapter_id,
                title=title,
                content=content,
                summary=summary,
            )
            if settings.kg_enabled and (content or "").strip():
                asyncio.create_task(
                    _ingest_kg_background(novel_id=novel_id, content=content)
                )
            return count
        except Exception as exc:
            last_exc = exc
            logger.warning(
                "index retry novel=%s chapter=%s attempt=%s/%s: %s",
                novel_id,
                chapter_id,
                attempt,
                max_attempts,
                exc,
            )
            if attempt >= max_attempts:
                break
            await asyncio.sleep(_BASE_DELAY_SEC * (2 ** (attempt - 1)))
    assert last_exc is not None
    raise last_exc


async def _ingest_kg_background(*, novel_id: str, content: str) -> None:
    try:
        from app.kg.pipeline import ingest_chapter_kg

        await ingest_chapter_kg(novel_id=novel_id, content=content)
    except Exception as exc:
        logger.warning("kg background ingest failed novel=%s: %s", novel_id, exc)
