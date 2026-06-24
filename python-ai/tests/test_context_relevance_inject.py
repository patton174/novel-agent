"""T3.11 — relevance injection into RUN_CONTEXT via context_patch."""

from __future__ import annotations

import asyncio

from app.agent.context.prompting.run_context import assemble_run_context
from app.agent.context.relevance import inject_relevant_context
from app.agent.schemas import AgentRunContext
from app.config import settings


def _ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        novel_id="novel-1",
        project={"id": "novel-1"},
        user_message="林动修炼",
        chapters=[],
    )


def test_relevance_inject_disabled(monkeypatch):
    monkeypatch.setattr(settings, "agent_relevance_inject", False)

    async def fake_hybrid(*a, **k):
        raise AssertionError("should not call hybrid_search")

    monkeypatch.setattr("app.rag.hybrid_search.hybrid_search", fake_hybrid)
    out = asyncio.run(inject_relevant_context(_ctx()))
    assert "relevant_context" not in (out.context_patch or {})


def test_relevance_inject_adds_snippets(monkeypatch):
    monkeypatch.setattr(settings, "agent_relevance_inject", True)

    async def fake_hybrid(novel_id, query, *, top_k=3, **kw):
        return [{"chapter_id": "c1", "title": "第一章", "content": "林动突破", "score": 0.9}]

    monkeypatch.setattr("app.rag.hybrid_search.hybrid_search", fake_hybrid)
    out = asyncio.run(inject_relevant_context(_ctx()))
    patch = out.context_patch or {}
    assert patch["relevant_context"][0]["content"] == "林动突破"

    assembled = assemble_run_context(out)
    assert assembled["session"]["relevant_context"][0]["content"] == "林动突破"
