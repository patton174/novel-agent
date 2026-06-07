"""KG query + GetCharacterGraph tool."""

from __future__ import annotations

import asyncio
import json

from app.agent.schemas import AgentRunContext
from app.agent.tools import knowledge
from app.agent.tools.schemas import GetCharacterGraphInput
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


def test_get_character_graph_disabled():
    out = asyncio.run(
        knowledge.get_character_graph(_ctx(), GetCharacterGraphInput(character="林动"))
    )
    payload = json.loads(out.content)
    assert payload.get("note")


def test_get_character_graph_returns_subgraph(monkeypatch):
    monkeypatch.setattr(settings, "kg_enabled", True)

    def fake_subgraph(novel_id, character, *, depth=1):
        return {
            "nodes": [{"id": "林动", "name": "林动", "type": "character"}],
            "edges": [{"source": "林动", "target": "师傅", "rel": "师承"}],
        }

    monkeypatch.setattr(knowledge, "character_graph", fake_subgraph)
    out = asyncio.run(
        knowledge.get_character_graph(_ctx(), GetCharacterGraphInput(character="林动"))
    )
    payload = json.loads(out.content)
    assert payload["nodes"][0]["name"] == "林动"
    assert payload["edges"][0]["rel"] == "师承"
