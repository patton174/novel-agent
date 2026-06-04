"""Chapter chunk index — in-memory fallback with optional Milvus."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from typing import Any

from app.rag.embeddings import cosine_similarity, embed_texts

logger = logging.getLogger(__name__)

_COLLECTION = "novel_chapters"
_CHUNK_SIZE = 480


@dataclass
class IndexedChunk:
    chunk_id: str
    novel_id: str
    chapter_id: str
    title: str
    text: str
    vector: list[float] = field(default_factory=list)


_MEMORY: dict[str, list[IndexedChunk]] = {}
_MILVUS_READY = False


def _split_chunks(title: str, content: str, summary: str | None) -> list[str]:
    header = f"{title}\n{summary or ''}\n".strip()
    body = (content or "").strip()
    if not body:
        return [header] if header else []
    chunks: list[str] = []
    if header:
        chunks.append(header[: _CHUNK_SIZE])
    for i in range(0, len(body), _CHUNK_SIZE):
        piece = body[i : i + _CHUNK_SIZE]
        chunks.append(piece)
    return chunks


def _milvus_upsert(chunks: list[IndexedChunk]) -> None:
    global _MILVUS_READY
    try:
        from pymilvus import Collection, CollectionSchema, DataType, FieldSchema, connections, utility

        if not _MILVUS_READY:
            from app.config import settings

            connections.connect(
                alias="default",
                host=settings.milvus_host,
                port=str(settings.milvus_port),
                user=settings.milvus_user or "",
                password=settings.milvus_password or "",
            )
            if not utility.has_collection(_COLLECTION):
                fields = [
                    FieldSchema(name="chunk_id", dtype=DataType.VARCHAR, max_length=64, is_primary=True),
                    FieldSchema(name="novel_id", dtype=DataType.VARCHAR, max_length=64),
                    FieldSchema(name="chapter_id", dtype=DataType.VARCHAR, max_length=64),
                    FieldSchema(name="title", dtype=DataType.VARCHAR, max_length=256),
                    FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=4096),
                    FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=len(chunks[0].vector)),
                ]
                Collection(name=_COLLECTION, schema=CollectionSchema(fields)).create()
            _MILVUS_READY = True

        col = Collection(_COLLECTION)
        col.delete(expr=f'chapter_id == "{chunks[0].chapter_id}"')
        col.insert(
            [
                [c.chunk_id for c in chunks],
                [c.novel_id for c in chunks],
                [c.chapter_id for c in chunks],
                [c.title for c in chunks],
                [c.text for c in chunks],
                [c.vector for c in chunks],
            ]
        )
        col.flush()
    except Exception as exc:
        logger.debug("Milvus upsert skipped: %s", exc)


async def index_chapter(
    *,
    novel_id: str,
    chapter_id: str,
    title: str,
    content: str,
    summary: str | None = None,
) -> int:
    pieces = _split_chunks(title, content, summary)
    if not pieces:
        await remove_chapter(chapter_id)
        return 0

    vectors = await embed_texts(pieces)
    chunks: list[IndexedChunk] = []
    for piece, vector in zip(pieces, vectors):
        chunks.append(
            IndexedChunk(
                chunk_id=f"{chapter_id}_{uuid.uuid4().hex[:8]}",
                novel_id=novel_id,
                chapter_id=chapter_id,
                title=title,
                text=piece,
                vector=vector,
            )
        )

    _MEMORY[novel_id] = [c for c in _MEMORY.get(novel_id, []) if c.chapter_id != chapter_id]
    _MEMORY[novel_id].extend(chunks)
    _milvus_upsert(chunks)
    return len(chunks)


async def remove_chapter(chapter_id: str) -> None:
    for novel_id, items in list(_MEMORY.items()):
        _MEMORY[novel_id] = [c for c in items if c.chapter_id != chapter_id]
    try:
        from pymilvus import Collection

        if _MILVUS_READY:
            Collection(_COLLECTION).delete(expr=f'chapter_id == "{chapter_id}"')
    except Exception:
        pass


async def clear_novel_index(novel_id: str) -> None:
    _MEMORY[novel_id] = []
    try:
        from pymilvus import Collection

        if _MILVUS_READY:
            Collection(_COLLECTION).delete(expr=f'novel_id == "{novel_id}"')
    except Exception:
        pass


async def reindex_novel(
    novel_id: str,
    chapters: list[dict[str, Any]],
) -> dict[str, int]:
    """Replace all vector chunks for a novel with fresh chapter embeddings."""
    await clear_novel_index(novel_id)

    indexed = 0
    for chapter in chapters:
        content = (chapter.get("content") or "").strip()
        if not content:
            continue
        await index_chapter(
            novel_id=novel_id,
            chapter_id=str(chapter["chapter_id"]),
            title=str(chapter.get("title") or ""),
            content=content,
            summary=chapter.get("summary"),
        )
        indexed += 1
    return {"indexed": indexed, "chapters": len(chapters)}


async def search_novel(
    novel_id: str,
    query: str,
    *,
    top_k: int = 5,
) -> list[dict[str, Any]]:
    if not query.strip():
        return []

    query_vec = (await embed_texts([query]))[0]
    items = _MEMORY.get(novel_id, [])
    if not items:
        return []

    scored = sorted(
        (
            {
                "chapter_id": c.chapter_id,
                "title": c.title,
                "content": c.text,
                "score": cosine_similarity(query_vec, c.vector),
            }
            for c in items
        ),
        key=lambda x: x["score"],
        reverse=True,
    )
    return scored[:top_k]
