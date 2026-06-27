"""KG ingest hook — run after chapter vector indexing. 结果回传 Java 持久化。"""

from __future__ import annotations

import logging

import httpx

from app.agent.backend.content_api import content_internal_url, internal_headers
from app.config import settings
from app.kg.extractor import extract_entities_relations

logger = logging.getLogger(__name__)


async def ingest_chapter_kg(*, novel_id: str, chapter_id: str, content: str) -> None:
    if not settings.kg_enabled:
        return
    text = (content or "").strip()
    if not text:
        return
    data = await extract_entities_relations(text)
    if data.get("error"):
        await _post_java(
            "kg/error",
            {"novelId": novel_id, "chapterId": chapter_id, "reason": data["error"]},
        )
        return
    if not data["entities"] and not data["relations"]:
        return
    await _post_java(
        "kg/ingest-chapter",
        {
            "novelId": novel_id,
            "chapterId": chapter_id,
            "entities": data["entities"],
            "relations": data["relations"],
        },
    )
    logger.info(
        "kg ingest-chapter posted novel=%s ch=%s entities=%s relations=%s",
        novel_id,
        chapter_id,
        len(data["entities"]),
        len(data["relations"]),
    )


async def _post_java(path: str, body: dict) -> None:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                content_internal_url(path), json=body, headers=internal_headers()
            )
            resp.raise_for_status()
    except Exception as exc:
        logger.warning("kg post java failed path=%s: %s", path, exc)
