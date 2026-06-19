"""SearchKnowledge tool — single hybrid path + no_match status (P3.2)."""

from __future__ import annotations

import asyncio
import json

from app.agent.schemas import AgentRunContext
from app.agent.tools import knowledge
from app.agent.tools.schemas import SearchKnowledgeInput


def _ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        novel_id="novel-1",
        project={"id": "novel-1"},
        chapters=[],
    )


def test_search_knowledge_hybrid_returns_hits(monkeypatch):
    async def fake_search(novel_id, query, *, top_k=5, mode="hybrid"):
        assert mode == "hybrid"
        return [{"chapter_id": "c1", "content": "片段", "score": 0.8}]

    monkeypatch.setattr(knowledge, "search_novel", fake_search)
    out = asyncio.run(
        knowledge.search_knowledge(_ctx(), SearchKnowledgeInput(query="林动"))
    )
    payload = json.loads(out.content)
    assert not out.is_error
    assert payload["status"] == "ok"
    assert payload["hits"][0]["chapter_id"] == "c1"


def test_search_knowledge_empty_is_no_match(monkeypatch):
    async def fake_search(novel_id, query, *, top_k=5, mode="hybrid"):
        return []

    monkeypatch.setattr(knowledge, "search_novel", fake_search)
    out = asyncio.run(
        knowledge.search_knowledge(_ctx(), SearchKnowledgeInput(query="不存在"))
    )
    payload = json.loads(out.content)
    assert not out.is_error
    assert payload["status"] == "no_match"
    assert payload["hits"] == []
    assert "index" in payload["hint"].lower()
