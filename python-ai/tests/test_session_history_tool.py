"""SearchSessionHistory tool tests."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest

from app.agent.schemas import AgentRunContext
from app.agent.tools.schemas import SearchSessionHistoryInput
from app.agent.tools.session_history import search_session_history
from app.rag.query_rewrite import RetrievalQueryPlan


def _ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="run-2",
        session_id="sess-1",
        message_id="m1",
        user_id=42,
        user_message="继续写",
    )


@pytest.mark.asyncio
async def test_search_session_history_requires_query_or_run_id():
    result = await search_session_history(_ctx(), SearchSessionHistoryInput())
    assert result.is_error
    assert "required" in result.content


@pytest.mark.asyncio
async def test_search_session_history_run_fetch():
    with patch(
        "app.agent.tools.session_history.fetch_session_messages",
        new=AsyncMock(
            return_value=[
                {"role": "user", "content": "hello", "createdAt": 1},
                {"role": "assistant", "content": "hi", "createdAt": 2},
            ]
        ),
    ), patch(
        "app.agent.tools.session_history.fetch_run_trace",
        new=AsyncMock(return_value='{"messages_compact": []}'),
    ):
        result = await search_session_history(
            _ctx(),
            SearchSessionHistoryInput(run_id="run-old"),
        )
    data = json.loads(result.content)
    assert data["status"] == "ok"
    assert data["mode"] == "run_fetch"
    assert data["hit"]["run_id"] == "run-old"
    assert len(data["hit"]["turns"]) == 2


@pytest.mark.asyncio
async def test_search_session_history_hybrid_query():
    plan = RetrievalQueryPlan(primary="第三章", rewrite_source="lexical")
    hits = [
        {
            "run_id": "run-a",
            "turn_kind": "user",
            "role": "user",
            "content": "写第三章",
            "rrf_score": 0.9,
        }
    ]
    with patch(
        "app.rag.session_search.search_session_with_query",
        new=AsyncMock(return_value=(plan, hits)),
    ), patch(
        "app.agent.tools.session_history.fetch_run_trace",
        new=AsyncMock(return_value=""),
    ):
        result = await search_session_history(
            _ctx(),
            SearchSessionHistoryInput(query="第三章", include_tool_bodies=False),
        )
    data = json.loads(result.content)
    assert data["status"] == "ok"
    assert data["mode"] == "hybrid_recall"
    assert len(data["hits"]) == 1
    assert data["query_plan"]["primary"] == "第三章"
