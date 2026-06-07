"""Crawl loop pairing repair and retry tests."""

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.agent.harness.message_history import repair_tool_message_pairing
from app.crawl.agent.loop_support import (
    is_retryable_crawl_tool_error,
    repeat_failure_hint,
    record_tool_outcome,
    tool_calls_from_ai,
)
from app.crawl.agent.context import CrawlAgentContext
from app.crawl.agent.tools.tool import CrawlToolResult


class _FakeClient:
    async def append_log(self, *args, **kwargs):
        pass


def _ctx() -> CrawlAgentContext:
    return CrawlAgentContext(
        job_id="t",
        entry_url="https://x/",
        goal="g",
        client=_FakeClient(),  # type: ignore[arg-type]
    )


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


def test_discover_chapters_not_silently_retried():
    err = CrawlToolResult(content='{"ok":false}', is_error=True)
    assert is_retryable_crawl_tool_error("QueueChapters", err) is False
    assert is_retryable_crawl_tool_error("FetchPage", err) is True


def test_repeat_failure_hint_after_two_errors():
    ctx = _ctx()
    args = {"novel_title": "x", "chapters": [{"url": "https://x/1", "sort_order": 1}]}
    err = CrawlToolResult(content='{"ok":false}', is_error=True)
    record_tool_outcome(ctx, "QueueChapters", args, err)
    assert repeat_failure_hint(ctx, "QueueChapters", args) is None
    record_tool_outcome(ctx, "QueueChapters", args, err)
    hint = repeat_failure_hint(ctx, "QueueChapters", args)
    assert hint is not None
