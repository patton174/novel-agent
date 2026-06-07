"""Tests for needs_context_search routing."""

from app.agent.harness.routing import needs_context_search
from app.agent.schemas import AgentRunContext


def test_needs_context_search_keywords():
    ctx = AgentRunContext(
        run_id="r",
        session_id="s",
        message_id="m",
        user_id=1,
        user_message="帮我搜索之前写过的伏笔",
    )
    assert needs_context_search(ctx) is True


def test_needs_context_search_negative():
    ctx = AgentRunContext(
        run_id="r",
        session_id="s",
        message_id="m",
        user_id=1,
        user_message="续写下一章",
    )
    assert needs_context_search(ctx) is False
