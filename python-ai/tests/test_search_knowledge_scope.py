"""search_knowledge scope 单测。"""

from __future__ import annotations

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


async def test_scope_novel_searches_ctx_novel():
    with patch(
        "app.agent.tools.knowledge.search_novel", new=AsyncMock(return_value=[{"title": "x", "text": "y"}])
    ) as m:
        await search_knowledge(_ctx(), SearchKnowledgeInput(query="q"))
        m.assert_awaited_once()
        assert m.call_args.args[0] == "novel-1"


async def test_scope_book_searches_referenced_namespace():
    ctx = _ctx(
        referenced=[
            {
                "catalogNovelId": "c1",
                "namespace": "library:10:c1",
                "indexStatus": "indexed",
            }
        ]
    )
    with patch(
        "app.agent.tools.knowledge.search_novel", new=AsyncMock(return_value=[{"title": "x", "text": "y"}])
    ) as m:
        await search_knowledge(ctx, SearchKnowledgeInput(query="q", scope="book:c1"))
        assert m.call_args.args[0] == "library:10:c1"


async def test_scope_book_missing_in_referenced_returns_not_in_library():
    import json

    ctx = _ctx(referenced=[{"catalogNovelId": "c2", "namespace": "library:10:c2"}])
    with patch("app.agent.tools.knowledge.search_novel", new=AsyncMock()) as m:
        result = await search_knowledge(ctx, SearchKnowledgeInput(query="q", scope="book:c9"))
        m.assert_not_awaited()
    payload = json.loads(result.content)
    assert payload["status"] == "not_in_library"
