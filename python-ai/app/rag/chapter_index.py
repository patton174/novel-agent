"""Chapter chunk index — Milvus-backed vector search."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from typing import Any, Protocol

from app.rag.chunking import chunk_text
from app.rag.embeddings import cosine_similarity, embed_texts

logger = logging.getLogger(__name__)

_COLLECTION = "novel_chapters"
_CHUNK_SIZE = 480
_INDEX_PARAMS = {"metric_type": "COSINE", "index_type": "IVF_FLAT", "params": {"nlist": 128}}
_SEARCH_PARAMS = {"metric_type": "COSINE", "params": {"nprobe": 16}}


@dataclass
class IndexedChunk:
    chunk_id: str
    novel_id: str
    chapter_id: str
    title: str
    text: str
    vector: list[float] = field(default_factory=list)


def _split_chunks(title: str, content: str, summary: str | None) -> list[str]:
    header = f"{title}\n{summary or ''}\n".strip()
    body = (content or "").strip()
    if not body:
        return [header] if header else []
    chunks: list[str] = []
    if header:
        chunks.append(header[:_CHUNK_SIZE])
    chunks.extend(chunk_text(body, chunk_size=_CHUNK_SIZE, overlap=80))
    return chunks


class ChapterIndexBackend(Protocol):
    def upsert(self, chunks: list[IndexedChunk]) -> None: ...
    def search(
        self, novel_id: str, query_vec: list[float], *, top_k: int
    ) -> list[dict[str, Any]]: ...
    def list_novel_chunks(self, novel_id: str) -> list[dict[str, Any]]: ...
    def remove_chapter(self, chapter_id: str) -> None: ...
    def clear_novel(self, novel_id: str) -> None: ...


class _MemoryBackend:
    """Test-only in-process backend (not authoritative in production)."""

    def __init__(self) -> None:
        self._store: dict[str, list[IndexedChunk]] = {}

    def upsert(self, chunks: list[IndexedChunk]) -> None:
        if not chunks:
            return
        novel_id = chunks[0].novel_id
        chapter_id = chunks[0].chapter_id
        items = [c for c in self._store.get(novel_id, []) if c.chapter_id != chapter_id]
        items.extend(chunks)
        self._store[novel_id] = items

    def search(
        self, novel_id: str, query_vec: list[float], *, top_k: int
    ) -> list[dict[str, Any]]:
        items = self._store.get(novel_id, [])
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

    def list_novel_chunks(self, novel_id: str) -> list[dict[str, Any]]:
        return [
            {
                "chunk_id": c.chunk_id,
                "chapter_id": c.chapter_id,
                "title": c.title,
                "content": c.text,
            }
            for c in self._store.get(novel_id, [])
        ]

    def remove_chapter(self, chapter_id: str) -> None:
        for novel_id, items in list(self._store.items()):
            self._store[novel_id] = [c for c in items if c.chapter_id != chapter_id]

    def clear_novel(self, novel_id: str) -> None:
        self._store[novel_id] = []


class _MilvusBackend:
    def __init__(self) -> None:
        self._ready = False
        self._dim: int | None = None

    def _connect(self) -> None:
        from pymilvus import connections

        from app.config import settings

        if self._ready:
            return
        connections.connect(
            alias="default",
            host=settings.milvus_host,
            port=str(settings.milvus_port),
            user=settings.milvus_user or "",
            password=settings.milvus_password or "",
        )
        self._ready = True

    def _ensure_collection(self, dim: int):
        from pymilvus import Collection, CollectionSchema, DataType, FieldSchema, utility

        self._connect()
        if not utility.has_collection(_COLLECTION):
            fields = [
                FieldSchema(
                    name="chunk_id", dtype=DataType.VARCHAR, max_length=64, is_primary=True
                ),
                FieldSchema(name="novel_id", dtype=DataType.VARCHAR, max_length=64),
                FieldSchema(name="chapter_id", dtype=DataType.VARCHAR, max_length=64),
                FieldSchema(name="title", dtype=DataType.VARCHAR, max_length=256),
                FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=4096),
                FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=dim),
            ]
            col = Collection(name=_COLLECTION, schema=CollectionSchema(fields))
            col.create()
            col.create_index(field_name="embedding", index_params=_INDEX_PARAMS)
            self._dim = dim
        col = Collection(_COLLECTION)
        if self._dim is None:
            self._dim = dim
        if not col.has_index():
            col.create_index(field_name="embedding", index_params=_INDEX_PARAMS)
        col.load()
        return col

    def upsert(self, chunks: list[IndexedChunk]) -> None:
        if not chunks:
            return
        col = self._ensure_collection(len(chunks[0].vector))
        chapter_id = chunks[0].chapter_id
        col.delete(expr=f'chapter_id == "{chapter_id}"')
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

    def search(
        self, novel_id: str, query_vec: list[float], *, top_k: int
    ) -> list[dict[str, Any]]:
        col = self._ensure_collection(len(query_vec))
        results = col.search(
            data=[query_vec],
            anns_field="embedding",
            param=_SEARCH_PARAMS,
            limit=top_k,
            expr=f'novel_id == "{novel_id}"',
            output_fields=["chapter_id", "title", "text"],
        )
        hits: list[dict[str, Any]] = []
        for group in results:
            for hit in group:
                entity = hit.entity
                hits.append(
                    {
                        "chapter_id": entity.get("chapter_id"),
                        "title": entity.get("title"),
                        "content": entity.get("text"),
                        "score": float(hit.distance),
                    }
                )
        return hits

    def list_novel_chunks(self, novel_id: str) -> list[dict[str, Any]]:
        if not self._ready:
            return []
        from pymilvus import Collection

        col = Collection(_COLLECTION)
        if not col.has_index():
            return []
        col.load()
        rows = col.query(
            expr=f'novel_id == "{novel_id}"',
            output_fields=["chunk_id", "chapter_id", "title", "text"],
        )
        return [
            {
                "chunk_id": row.get("chunk_id"),
                "chapter_id": row.get("chapter_id"),
                "title": row.get("title"),
                "content": row.get("text"),
            }
            for row in rows
        ]

    def remove_chapter(self, chapter_id: str) -> None:
        if not self._ready:
            return
        from pymilvus import Collection

        Collection(_COLLECTION).delete(expr=f'chapter_id == "{chapter_id}"')

    def clear_novel(self, novel_id: str) -> None:
        if not self._ready:
            return
        from pymilvus import Collection

        Collection(_COLLECTION).delete(expr=f'novel_id == "{novel_id}"')


_milvus_backend = _MilvusBackend()
_test_backend: ChapterIndexBackend | None = None


def _get_backend() -> ChapterIndexBackend:
    if _test_backend is not None:
        return _test_backend
    return _milvus_backend


def set_test_backend(backend: ChapterIndexBackend | None) -> None:
    """Swap index backend for unit tests only."""
    global _test_backend
    _test_backend = backend


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

    try:
        _get_backend().upsert(chunks)
    except Exception as exc:
        logger.error("chapter index upsert failed: %s", exc)
        raise
    return len(chunks)


async def remove_chapter(chapter_id: str) -> None:
    try:
        _get_backend().remove_chapter(chapter_id)
    except Exception as exc:
        logger.warning("chapter index remove failed: %s", exc)


async def clear_novel_index(novel_id: str) -> None:
    try:
        _get_backend().clear_novel(novel_id)
    except Exception as exc:
        logger.warning("chapter index clear failed: %s", exc)


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


async def vector_search(
    novel_id: str,
    query: str,
    *,
    top_k: int = 5,
) -> list[dict[str, Any]]:
    if not query.strip():
        return []

    query_vec = (await embed_texts([query]))[0]
    try:
        return _get_backend().search(novel_id, query_vec, top_k=top_k)
    except Exception as exc:
        logger.error("chapter index search failed: %s", exc)
        raise


def list_novel_chunks(novel_id: str) -> list[dict[str, Any]]:
    try:
        return _get_backend().list_novel_chunks(novel_id)
    except Exception as exc:
        logger.warning("list novel chunks failed: %s", exc)
        return []


async def search_novel(
    novel_id: str,
    query: str,
    *,
    top_k: int = 5,
    mode: str = "hybrid",
) -> list[dict[str, Any]]:
    from app.config import settings

    if mode == "vector" or not settings.rag_hybrid_enabled:
        return await vector_search(novel_id, query, top_k=top_k)

    from app.rag.hybrid_search import hybrid_search

    return await hybrid_search(novel_id, query, top_k=top_k)
