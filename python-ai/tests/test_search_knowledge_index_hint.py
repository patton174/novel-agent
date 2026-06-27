"""SearchKnowledge book scope index_status hints (P0-G1)."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

from app.agent.schemas import AgentRunContext
from app.agent.tools.knowledge import search_knowledge
from app.agent.tools.schemas import SearchKnowledgeInput


def _ctx(referenced=None):
    ctx = AgentRunContext(
        run_id="r", session_id="s", message_id="m", user_id=10, novel_id="novel-1"
    )
    ctx.referenced_books = referenced or []
    return ctx


async def test_book_scope_indexing_returns_hint():
    ctx = _ctx(
        referenced=[
            {
                "catalogNovelId": "abc",
                "namespace": "library:1:abc",
                "indexStatus": "indexing",
            }
        ]
    )
    with patch("app.agent.tools.knowledge.search_novel", new=AsyncMock()) as m:
        result = await search_knowledge(
            ctx, SearchKnowledgeInput(query="风格", scope="book:abc")
        )
        m.assert_not_awaited()
    payload = json.loads(result.content)
    assert payload["status"] == "indexing"
    assert "索引" in payload.get("hint", "")


async def test_book_scope_pending_returns_hint():
    ctx = _ctx(
        referenced=[
            {
                "catalogNovelId": "abc",
                "namespace": "library:1:abc",
                "index_status": "pending",
            }
        ]
    )
    with patch("app.agent.tools.knowledge.search_novel", new=AsyncMock()) as m:
        result = await search_knowledge(
            ctx, SearchKnowledgeInput(query="风格", scope="book:abc")
        )
        m.assert_not_awaited()
    payload = json.loads(result.content)
    assert payload["status"] == "indexing"
    assert payload["hits"] == []


async def test_book_scope_failed_returns_hint():
    ctx = _ctx(
        referenced=[
            {
                "catalogNovelId": "abc",
                "namespace": "library:1:abc",
                "indexStatus": "failed",
            }
        ]
    )
    with patch("app.agent.tools.knowledge.search_novel", new=AsyncMock()) as m:
        result = await search_knowledge(
            ctx, SearchKnowledgeInput(query="风格", scope="book:abc")
        )
        m.assert_not_awaited()
    payload = json.loads(result.content)
    assert payload["status"] == "index_failed"
    assert "失败" in payload.get("hint", "")


async def test_book_scope_not_in_library():
    ctx = _ctx(
        referenced=[
            {
                "catalogNovelId": "other",
                "namespace": "library:1:other",
                "indexStatus": "indexed",
            }
        ]
    )
    with patch("app.agent.tools.knowledge.search_novel", new=AsyncMock()) as m:
        result = await search_knowledge(
            ctx, SearchKnowledgeInput(query="风格", scope="book:missing")
        )
        m.assert_not_awaited()
    payload = json.loads(result.content)
    assert payload["status"] == "not_in_library"
    assert "引用" in payload.get("hint", "")


async def test_book_scope_indexed_calls_search_novel():
    ctx = _ctx(
        referenced=[
            {
                "catalogNovelId": "abc",
                "namespace": "library:1:abc",
                "indexStatus": "indexed",
            }
        ]
    )
    with patch(
        "app.agent.tools.knowledge.search_novel",
        new=AsyncMock(return_value=[{"title": "x", "text": "y"}]),
    ) as m:
        result = await search_knowledge(
            ctx, SearchKnowledgeInput(query="风格", scope="book:abc")
        )
        m.assert_awaited_once()
        assert m.call_args.args[0] == "library:1:abc"
    payload = json.loads(result.content)
    assert payload["status"] == "ok"
    assert payload["hits"]


async def test_book_scope_ready_maps_to_indexed_and_searches():
    ctx = _ctx(
        referenced=[
            {
                "catalogNovelId": "abc",
                "namespace": "library:1:abc",
                "indexStatus": "ready",
            }
        ]
    )
    with patch(
        "app.agent.tools.knowledge.search_novel",
        new=AsyncMock(return_value=[{"title": "x", "text": "y"}]),
    ) as m:
        await search_knowledge(ctx, SearchKnowledgeInput(query="风格", scope="book:abc"))
        m.assert_awaited_once()
        assert m.call_args.args[0] == "library:1:abc"
