"""SearchKnowledge tool — vector / hybrid / graph modes."""

from __future__ import annotations

import asyncio
import json

from app.agent.schemas import AgentRunContext
from app.agent.tools import knowledge
from app.agent.tools.schemas import SearchKnowledgeInput, SearchMode
from app.config import settings


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


def test_search_knowledge_vector(monkeypatch):
    async def fake_search(novel_id, query, *, top_k=5, mode="hybrid"):
        assert mode == "vector"
        return [{"chapter_id": "c1", "content": "片段", "score": 0.8}]

    monkeypatch.setattr(knowledge, "search_novel", fake_search)
    out = asyncio.run(
        knowledge.search_knowledge(
            _ctx(),
            SearchKnowledgeInput(query="林动", mode=SearchMode.vector),
        )
    )
    assert "c1" in out.content and not out.is_error


def test_search_knowledge_graph_when_enabled(monkeypatch):
    monkeypatch.setattr(settings, "kg_enabled", True)

    def fake_graph(novel_id, character, *, depth=1):
        return {"nodes": [{"name": "林动"}], "edges": []}

    monkeypatch.setattr(knowledge, "character_graph", fake_graph)
    out = asyncio.run(
        knowledge.search_knowledge(
            _ctx(),
            SearchKnowledgeInput(query="林动", mode=SearchMode.graph),
        )
    )
    payload = json.loads(out.content)
    assert payload["graph"]["nodes"][0]["name"] == "林动"
