"""Session turn index — Milvus + in-memory backend for cross-run session RAG."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from typing import Any, Protocol

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage

from app.agent.context.prompting.run_context import format_current_chapter_row
from app.agent.harness.message_history import is_run_context_human
from app.agent.schemas import AgentRunContext
from app.rag.embeddings import cosine_similarity, embed_texts

logger = logging.getLogger(__name__)

_COLLECTION = "agent_session_turns"
_TEXT_MAX = 4096
_INDEX_PARAMS = {"metric_type": "COSINE", "index_type": "IVF_FLAT", "params": {"nlist": 128}}
_SEARCH_PARAMS = {"metric_type": "COSINE", "params": {"nprobe": 16}}


@dataclass
class SessionIndexedChunk:
    chunk_id: str
    session_id: str
    novel_id: str
    run_id: str
    turn_kind: str
    role: str
    text: str
    created_at_ms: int = 0
    tool_name: str = ""
    vector: list[float] = field(default_factory=list)


class SessionIndexBackend(Protocol):
    def upsert(self, chunks: list[SessionIndexedChunk]) -> None: ...
    def search(
        self, session_id: str, query_vec: list[float], *, top_k: int
    ) -> list[dict[str, Any]]: ...
    def list_session_chunks(self, session_id: str) -> list[dict[str, Any]]: ...
    def remove_run(self, session_id: str, run_id: str) -> None: ...


class _MemoryBackend:
    def __init__(self) -> None:
        self._store: dict[str, list[SessionIndexedChunk]] = {}

    def upsert(self, chunks: list[SessionIndexedChunk]) -> None:
        if not chunks:
            return
        session_id = chunks[0].session_id
        run_id = chunks[0].run_id
        items = [
            c
            for c in self._store.get(session_id, [])
            if c.run_id != run_id
        ]
        items.extend(chunks)
        self._store[session_id] = items

    def search(
        self, session_id: str, query_vec: list[float], *, top_k: int
    ) -> list[dict[str, Any]]:
        items = self._store.get(session_id, [])
        if not items:
            return []
        scored = sorted(
            (
                {
                    "chunk_id": c.chunk_id,
                    "session_id": c.session_id,
                    "novel_id": c.novel_id,
                    "run_id": c.run_id,
                    "turn_kind": c.turn_kind,
                    "role": c.role,
                    "tool_name": c.tool_name,
                    "content": c.text,
                    "created_at_ms": c.created_at_ms,
                    "score": cosine_similarity(query_vec, c.vector),
                }
                for c in items
            ),
            key=lambda x: x["score"],
            reverse=True,
        )
        return scored[:top_k]

    def list_session_chunks(self, session_id: str) -> list[dict[str, Any]]:
        return [
            {
                "chunk_id": c.chunk_id,
                "session_id": c.session_id,
                "novel_id": c.novel_id,
                "run_id": c.run_id,
                "turn_kind": c.turn_kind,
                "role": c.role,
                "tool_name": c.tool_name,
                "content": c.text,
                "created_at_ms": c.created_at_ms,
            }
            for c in self._store.get(session_id, [])
        ]

    def remove_run(self, session_id: str, run_id: str) -> None:
        self._store[session_id] = [
            c for c in self._store.get(session_id, []) if c.run_id != run_id
        ]


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
                FieldSchema(name="session_id", dtype=DataType.VARCHAR, max_length=64),
                FieldSchema(name="novel_id", dtype=DataType.VARCHAR, max_length=64),
                FieldSchema(name="run_id", dtype=DataType.VARCHAR, max_length=64),
                FieldSchema(name="turn_kind", dtype=DataType.VARCHAR, max_length=32),
                FieldSchema(name="role", dtype=DataType.VARCHAR, max_length=16),
                FieldSchema(name="tool_name", dtype=DataType.VARCHAR, max_length=64),
                FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=_TEXT_MAX),
                FieldSchema(name="created_at_ms", dtype=DataType.INT64),
                FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=dim),
            ]
            col = Collection(name=_COLLECTION, schema=CollectionSchema(fields))
            col.create_index(field_name="embedding", index_params=_INDEX_PARAMS)
            self._dim = dim
        col = Collection(_COLLECTION)
        if self._dim is None:
            self._dim = dim
        if not col.has_index():
            col.create_index(field_name="embedding", index_params=_INDEX_PARAMS)
        col.load()
        return col

    def upsert(self, chunks: list[SessionIndexedChunk]) -> None:
        if not chunks:
            return
        col = self._ensure_collection(len(chunks[0].vector))
        session_id = chunks[0].session_id
        run_id = chunks[0].run_id
        col.delete(expr=f'session_id == "{session_id}" and run_id == "{run_id}"')
        col.insert(
            [
                [c.chunk_id for c in chunks],
                [c.session_id for c in chunks],
                [c.novel_id for c in chunks],
                [c.run_id for c in chunks],
                [c.turn_kind for c in chunks],
                [c.role for c in chunks],
                [c.tool_name for c in chunks],
                [c.text[:_TEXT_MAX] for c in chunks],
                [c.created_at_ms for c in chunks],
                [c.vector for c in chunks],
            ]
        )
        col.flush()

    def search(
        self, session_id: str, query_vec: list[float], *, top_k: int
    ) -> list[dict[str, Any]]:
        col = self._ensure_collection(len(query_vec))
        results = col.search(
            data=[query_vec],
            anns_field="embedding",
            param=_SEARCH_PARAMS,
            limit=top_k,
            expr=f'session_id == "{session_id}"',
            output_fields=[
                "novel_id",
                "run_id",
                "turn_kind",
                "role",
                "tool_name",
                "text",
                "created_at_ms",
            ],
        )
        hits: list[dict[str, Any]] = []
        for group in results:
            for hit in group:
                entity = hit.entity
                hits.append(
                    {
                        "chunk_id": hit.id,
                        "session_id": session_id,
                        "novel_id": entity.get("novel_id"),
                        "run_id": entity.get("run_id"),
                        "turn_kind": entity.get("turn_kind"),
                        "role": entity.get("role"),
                        "tool_name": entity.get("tool_name"),
                        "content": entity.get("text"),
                        "created_at_ms": entity.get("created_at_ms"),
                        "score": float(hit.distance) if hasattr(hit, "distance") else hit.score,
                    }
                )
        return hits

    def list_session_chunks(self, session_id: str) -> list[dict[str, Any]]:
        col = self._ensure_collection(self._dim or 384)
        rows = col.query(
            expr=f'session_id == "{session_id}"',
            output_fields=[
                "chunk_id",
                "novel_id",
                "run_id",
                "turn_kind",
                "role",
                "tool_name",
                "text",
                "created_at_ms",
            ],
            limit=16384,
        )
        return [
            {
                "chunk_id": r.get("chunk_id"),
                "session_id": session_id,
                "novel_id": r.get("novel_id"),
                "run_id": r.get("run_id"),
                "turn_kind": r.get("turn_kind"),
                "role": r.get("role"),
                "tool_name": r.get("tool_name"),
                "content": r.get("text"),
                "created_at_ms": r.get("created_at_ms"),
            }
            for r in (rows or [])
        ]

    def remove_run(self, session_id: str, run_id: str) -> None:
        col = self._ensure_collection(self._dim or 384)
        col.delete(expr=f'session_id == "{session_id}" and run_id == "{run_id}"')
        col.flush()


_milvus_backend = _MilvusBackend()
_test_backend: SessionIndexBackend | None = None


def _get_backend() -> SessionIndexBackend:
    if _test_backend is not None:
        return _test_backend
    return _milvus_backend


def set_test_backend(backend: SessionIndexBackend | None) -> None:
    global _test_backend
    _test_backend = backend


def _clip(text: str, limit: int = 1800) -> str:
    body = str(text or "").strip()
    if len(body) <= limit:
        return body
    return body[: limit - 1] + "…"


def build_documents_from_run(
    ctx: AgentRunContext,
    messages: list[BaseMessage],
) -> list[dict[str, Any]]:
    """Turn user / assistant / tool messages into indexable documents."""
    session_id = str(ctx.session_id or "").strip()
    run_id = str(ctx.run_id or "").strip()
    if not session_id or not run_id:
        return []

    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    docs: list[dict[str, Any]] = []
    user_msg = str(ctx.user_message or "").strip()
    if user_msg:
        docs.append(
            {
                "turn_kind": "user",
                "role": "user",
                "text": _clip(user_msg),
                "tool_name": "",
            }
        )

    pending_tools: dict[str, str] = {}
    for msg in messages:
        if isinstance(msg, AIMessage):
            for tc in msg.tool_calls or []:
                if isinstance(tc, dict):
                    tid = str(tc.get("id") or "")
                    name = str(tc.get("name") or "tool")
                else:
                    tid = str(getattr(tc, "id", "") or "")
                    name = str(getattr(tc, "name", "") or "tool")
                if tid:
                    pending_tools[tid] = name
            body = str(msg.content or "").strip()
            if body and not (msg.tool_calls or []):
                docs.append(
                    {
                        "turn_kind": "assistant",
                        "role": "assistant",
                        "text": _clip(body),
                        "tool_name": "",
                    }
                )
            continue
        if isinstance(msg, ToolMessage):
            tid = str(msg.tool_call_id or "")
            tool_name = pending_tools.get(tid) or str(getattr(msg, "name", None) or "tool")
            body = msg.content if isinstance(msg.content, str) else str(msg.content or "")
            docs.append(
                {
                    "turn_kind": "tool",
                    "role": "tool",
                    "text": _clip(f"{tool_name}: {body}", 1200),
                    "tool_name": tool_name,
                }
            )

    return docs


def recent_turns_from_history(ctx: AgentRunContext, *, limit: int = 4) -> list[dict]:
    rows: list[dict] = []
    for turn in (ctx.history or [])[-limit:]:
        if not isinstance(turn, dict):
            continue
        role = str(turn.get("role") or "").strip()
        content = str(turn.get("content") or "").strip()
        if role and content:
            rows.append({"role": role, "content": content[:300]})
    return rows


async def index_session_run(
    ctx: AgentRunContext,
    messages: list[BaseMessage],
) -> int:
    """Embed and upsert all indexable documents for one run."""
    from app.config import settings

    if not getattr(settings, "agent_session_recall_index_enabled", True):
        return 0

    session_id = str(ctx.session_id or "").strip()
    run_id = str(ctx.run_id or "").strip()
    if not session_id or not run_id:
        return 0

    raw_docs = build_documents_from_run(ctx, messages)
    if not raw_docs:
        return 0

    texts = [str(d["text"]) for d in raw_docs]
    vectors = await embed_texts(texts)
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    created_at_ms = int(__import__("time").time() * 1000)

    chunks: list[SessionIndexedChunk] = []
    for doc, vector in zip(raw_docs, vectors):
        chunks.append(
            SessionIndexedChunk(
                chunk_id=f"{run_id}_{uuid.uuid4().hex[:8]}",
                session_id=session_id,
                novel_id=novel_id,
                run_id=run_id,
                turn_kind=str(doc["turn_kind"]),
                role=str(doc["role"]),
                text=str(doc["text"]),
                created_at_ms=created_at_ms,
                tool_name=str(doc.get("tool_name") or ""),
                vector=vector,
            )
        )

    try:
        _get_backend().upsert(chunks)
    except Exception as exc:
        logger.warning("session index upsert failed session=%s run=%s: %s", session_id, run_id, exc)
        return 0
    return len(chunks)


async def vector_search_session(
    session_id: str,
    query: str,
    *,
    top_k: int = 20,
) -> list[dict[str, Any]]:
    if not query.strip() or not session_id.strip():
        return []
    query_vec = (await embed_texts([query]))[0]
    try:
        return _get_backend().search(session_id, query_vec, top_k=top_k)
    except Exception as exc:
        logger.warning("session vector search failed: %s", exc)
        return []


def list_session_chunks(session_id: str) -> list[dict[str, Any]]:
    try:
        return _get_backend().list_session_chunks(session_id)
    except Exception as exc:
        logger.warning("list session chunks failed: %s", exc)
        return []


def chapter_hint_from_ctx(ctx: AgentRunContext) -> str:
    row = format_current_chapter_row(ctx)
    return row[:200] if row else ""
