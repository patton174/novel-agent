"""Knowledge graph HTTP routes."""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.kg.extractor import extract_entities_relations
from app.kg.store import get_novel_graph

router = APIRouter(prefix="/kg", tags=["KnowledgeGraph"])
internal_router = APIRouter(prefix="/kg", tags=["KnowledgeGraph Internal"])


def _verify_internal_key(key: str | None) -> None:
    expected = settings.internal_service_key
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="invalid internal service key")


class KgExtractRequest(BaseModel):
    text: str
    novelId: str | None = None
    chapterId: str | None = None


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


@internal_router.post("/extract")
async def extract_route(
    body: KgExtractRequest,
    x_internal_service_key: str | None = Header(default=None, alias="X-Internal-Service-Key"),
):
    _verify_internal_key(x_internal_service_key)
    try:
        result = await extract_entities_relations(body.text)
        return result
    except Exception as e:
        return {"error": "extract_failed", "detail": str(e)}
