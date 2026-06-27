"""Tests for session recall inject into context_patch."""

import pytest

from app.agent.context.session_recall_service import format_recalled_hits, inject_session_recall
from app.agent.schemas import AgentRunContext


@pytest.mark.asyncio
async def test_inject_session_recall_writes_patch(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "agent_session_recall_enabled", True)

    async def _fake_search(ctx, *, top_k=None):
        from app.rag.query_rewrite import RetrievalQueryPlan

        plan = RetrievalQueryPlan(primary="audit", variants=["ChapterAudit"], rewrite_source="test")
        hits = [
            {
                "chunk_id": "c1",
                "run_id": "r-old",
                "turn_kind": "tool",
                "role": "tool",
                "tool_name": "ChapterAudit",
                "content": "第三章节奏偏慢",
                "rrf_score": 0.9,
            }
        ]
        return plan, hits

    monkeypatch.setattr(
        "app.rag.session_search.search_session_for_ctx",
        _fake_search,
    )
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m",
        user_id=1,
        user_message="上次审计结论",
    )
    out = await inject_session_recall(ctx)
    recalled = (out.context_patch or {}).get("session_recalled")
    assert recalled
    assert recalled["turns"][0]["snippet"]
    assert recalled["query_plan"]["primary"] == "audit"


def test_format_recalled_hits_dedupes():
    hits = [
        {"chunk_id": "a", "run_id": "r1", "turn_kind": "user", "role": "user", "content": "x" * 900},
        {"chunk_id": "a", "run_id": "r1", "turn_kind": "user", "role": "user", "content": "dup"},
    ]
    block = format_recalled_hits(hits)
    assert len(block["turns"]) == 1
    assert len(block["turns"][0]["snippet"]) <= 720
