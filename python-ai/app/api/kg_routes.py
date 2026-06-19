"""Knowledge graph HTTP routes."""

from __future__ import annotations

from fastapi import APIRouter

from app.config import settings
from app.kg.store import get_novel_graph

router = APIRouter(prefix="/kg", tags=["KnowledgeGraph"])


@router.get("/novels/{novel_id}/graph")
async def novel_graph_route(novel_id: str):
    if not settings.kg_enabled:
        return {
            "enabled": False,
            "nodes": [],
            "edges": [],
            "note": "知识图谱未启用（KG_ENABLED=false）",
        }
    graph = get_novel_graph(novel_id)
    return {"enabled": True, **graph}
