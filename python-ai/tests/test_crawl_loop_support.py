"""Crawl loop pairing repair and retry tests."""

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.agent_step.message_history import repair_tool_message_pairing
from app.crawl_agent.loop_support import tool_calls_from_ai


def test_tool_calls_from_ai_requires_id():
    ai = AIMessage(
        content="",
        tool_calls=[
            {"id": "call_abc", "name": "FetchPage", "args": {"url": "https://x/"}},
            {"id": "", "name": "FetchPage", "args": {"url": "https://y/"}},
        ],
    )
    calls = tool_calls_from_ai(ai)
    assert len(calls) == 1
    assert calls[0].tool_call_id == "call_abc"


def test_repair_orphan_tool_message():
    messages = [
        SystemMessage(content="sys"),
        HumanMessage(content="task"),
        AIMessage(
            content="",
            tool_calls=[{"id": "c1", "name": "FetchPage", "args": {}}],
        ),
    ]
    repaired, changed = repair_tool_message_pairing(messages)
    assert changed
    assert any(isinstance(m, ToolMessage) for m in repaired)
