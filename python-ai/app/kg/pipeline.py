"""KG ingest hook — run after chapter vector indexing."""

from __future__ import annotations

import logging

from app.config import settings
from app.kg.extractor import extract_entities_relations
from app.kg.store import upsert_graph

logger = logging.getLogger(__name__)


async def ingest_chapter_kg(*, novel_id: str, content: str) -> None:
    if not settings.kg_enabled:
        return
    text = (content or "").strip()
    if not text:
        return
    data = await extract_entities_relations(text)
    if not data["entities"] and not data["relations"]:
        return
    upsert_graph(novel_id, data["entities"], data["relations"])
    logger.info(
        "kg upsert novel=%s entities=%s relations=%s",
        novel_id,
        len(data["entities"]),
        len(data["relations"]),
    )
