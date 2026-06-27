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


async def novel_graph(novel_id: str) -> dict:
    """Full novel KG from Java PG (compact formatting done client-side)."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                content_internal_url("kg/novel-graph"),
                params={"novelId": novel_id},
                headers=internal_headers(),
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.warning("kg novel-graph fetch failed novel=%s: %s", novel_id, exc)
        return {"nodes": [], "edges": []}


def format_kg_snapshot(
    graph: dict,
    *,
    max_entities: int = 18,
    max_relations: int = 24,
) -> dict | None:
    """Compact entity/relation roster for RUN_CONTEXT (not full graph dump)."""
    nodes = graph.get("nodes") if isinstance(graph.get("nodes"), list) else []
    edges = graph.get("edges") if isinstance(graph.get("edges"), list) else []
    if not nodes:
        return None

    def _type_rank(n: dict) -> tuple[int, str]:
        t = str(n.get("type") or "unknown").lower()
        order = {"character": 0, "location": 1, "organization": 2, "item": 3}
        return (order.get(t, 9), str(n.get("name") or ""))

    picked_nodes = sorted(
        [n for n in nodes if isinstance(n, dict) and n.get("name")],
        key=_type_rank,
    )[:max_entities]
    names = {str(n.get("name")) for n in picked_nodes}
    rels: list[dict[str, str]] = []
    for e in edges:
        if not isinstance(e, dict):
            continue
        src = str(e.get("src") or e.get("source") or "").strip()
        dst = str(e.get("dst") or e.get("target") or "").strip()
        rel = str(e.get("rel") or e.get("relation") or "").strip()
        if not src or not dst or not rel:
            continue
        if src not in names and dst not in names:
            continue
        rels.append({"src": src, "rel": rel, "dst": dst})
        if len(rels) >= max_relations:
            break

    entities = [
        {
            "name": str(n.get("name")),
            "type": str(n.get("type") or "unknown"),
            **(
                {"aliases": str(n.get("aliases"))}
                if n.get("aliases")
                else {}
            ),
        }
        for n in picked_nodes
    ]
    return {
        "entities": entities,
        "relations": rels,
        "entity_count": len(nodes),
        "relation_count": len(edges),
        "hint": "Use GetCharacterGraph(character) for neighborhood detail; SearchKnowledge for chapter text.",
    }
