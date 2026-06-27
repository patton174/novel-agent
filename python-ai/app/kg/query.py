"""Knowledge graph query helpers — HTTP 调 Java 子图。"""

from __future__ import annotations

import logging

import httpx

from app.agent.backend.content_api import content_internal_url, internal_headers

logger = logging.getLogger(__name__)


async def character_graph(
    novel_id: str, character: str, *, depth: int = 1
) -> dict[str, list]:
    """Return nodes/edges subgraph centered on a character (HTTP 调 Java)."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                content_internal_url("kg/character-graph"),
                params={"novelId": novel_id, "name": character},
                headers=internal_headers(),
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.warning(
            "kg character-graph fetch failed novel=%s name=%s: %s",
            novel_id,
            character,
            exc,
        )
        return {"nodes": [], "edges": [], "note": f"查询失败: {exc}"}
