"""Tests for session hybrid search with memory backend."""

import pytest
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from app.agent.schemas import AgentRunContext
from app.rag.query_rewrite import RetrievalQueryPlan
from app.rag.session_index import (
    SessionIndexedChunk,
    _MemoryBackend,
    index_session_run,
    set_test_backend,
)
from app.rag.session_search import bm25_session_recall, hybrid_session_search


@pytest.fixture(autouse=True)
def memory_backend():
    backend = _MemoryBackend()
    set_test_backend(backend)
    yield backend
    set_test_backend(None)


@pytest.mark.asyncio
async def test_index_and_hybrid_search_finds_relevant_run(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "rag_embed_fail_fast", False)

    ctx = AgentRunContext(
        run_id="run-a",
        session_id="sess-1",
        message_id="m1",
        user_id=1,
        user_message="写第三章林动突破",
        novel_id="novel-1",
    )
    messages = [
        HumanMessage(content="写第三章林动突破"),
        AIMessage(content="", tool_calls=[{"id": "t1", "name": "ChapterAudit", "args": {}}]),
        ToolMessage(content="审计：第三章节奏偏慢，建议加强冲突", tool_call_id="t1"),
        AIMessage(content="我会加强第三章冲突描写。"),
    ]
    n = await index_session_run(ctx, messages)
    assert n >= 2

    ctx2 = AgentRunContext(
        run_id="run-b",
        session_id="sess-1",
        message_id="m2",
        user_id=1,
        user_message="上次第三章审计说了什么",
        novel_id="novel-1",
    )
    await index_session_run(
        ctx2,
        [
            HumanMessage(content="上次第三章审计说了什么"),
            AIMessage(content="我先查一下。"),
        ],
    )

    plan = RetrievalQueryPlan(
        primary="第三章审计 ChapterAudit",
        variants=["林动 第三章 节奏", "chapter audit conflict"],
        keywords=["审计", "第三章"],
        rewrite_source="test",
    )
    hits = await hybrid_session_search("sess-1", plan, top_k=3)
    assert hits
    bodies = " ".join(str(h.get("content") or "") for h in hits)
    assert "审计" in bodies or "ChapterAudit" in bodies


def test_bm25_session_recall(memory_backend):
    memory_backend.upsert(
        [
            SessionIndexedChunk(
                chunk_id="c1",
                session_id="s1",
                novel_id="n1",
                run_id="r1",
                turn_kind="tool",
                role="tool",
                text="ListChapters: 共 12 章",
                tool_name="ListChapters",
                vector=[0.1] * 8,
            )
        ]
    )
    hits = bm25_session_recall("s1", "章节目录 ListChapters", top_k=2)
    assert len(hits) == 1
    assert "ListChapters" in hits[0]["content"]
