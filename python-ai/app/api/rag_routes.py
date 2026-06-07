"""RAG indexing API routes."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.rag.chapter_index import clear_novel_index, reindex_novel, remove_chapter, search_novel
from app.rag.ingest_queue import index_with_retry

router = APIRouter(prefix="/rag", tags=["RAG"])


class IndexChapterRequest(BaseModel):
    novel_id: str = Field(..., min_length=1)
    chapter_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    content: str = ""
    summary: str | None = None


class SearchRequest(BaseModel):
    novel_id: str
    query: str
    top_k: int = 5


class ReindexChapterItem(BaseModel):
    chapter_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    content: str = ""
    summary: str | None = None


class ReindexNovelRequest(BaseModel):
    novel_id: str = Field(..., min_length=1)
    chapters: list[ReindexChapterItem] = Field(default_factory=list)


@router.post("/index/chapter")
async def index_chapter_route(body: IndexChapterRequest):
    count = await index_with_retry(
        novel_id=body.novel_id,
        chapter_id=body.chapter_id,
        title=body.title,
        content=body.content,
        summary=body.summary,
    )
    return {"ok": True, "chunks": count}


@router.delete("/index/chapter/{chapter_id}")
async def delete_chapter_index(chapter_id: str):
    await remove_chapter(chapter_id)
    return {"ok": True}


@router.delete("/index/novel/{novel_id}")
async def delete_novel_index(novel_id: str):
    await clear_novel_index(novel_id)
    return {"ok": True}


@router.post("/search")
async def search_route(body: SearchRequest):
    hits = await search_novel(body.novel_id, body.query, top_k=body.top_k)
    return {"hits": hits}


@router.post("/reindex/novel")
async def reindex_novel_route(body: ReindexNovelRequest):
    stats = await reindex_novel(
        body.novel_id,
        [item.model_dump() for item in body.chapters],
    )
    return {"ok": True, **stats}
