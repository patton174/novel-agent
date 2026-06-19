"""Chapter catalog batch cache for parallel ReadChapter."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.agent.harness.tool_orchestration import ToolBatch, ToolExecutionItem, execute_tool_batches
from app.agent.schemas import AgentRunContext
from app.agent.tools.chapter_catalog import (
    clear_chapter_rows_cache,
    load_chapter_rows,
    prime_chapter_rows_cache,
)


@pytest.fixture
def ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="run-1",
        session_id="sess-1",
        message_id="msg-1",
        user_id=1,
        novel_id="novel-1",
        project={"id": "novel-1"},
    )


@pytest.mark.asyncio
async def test_parallel_batch_primes_chapter_rows_once(ctx: AgentRunContext):
    fetch_mock = AsyncMock(return_value=[{"id": "c1", "title": "第一章", "list_index": 1}])

    class Outcome:
        result = None
        failed = False
        error = ""
        message_output = ""

    async def fake_stream_tool_step(c, tool, inp, *, sequence, outcome, step_id=None):
        await load_chapter_rows(c)
        yield {"type": "tool.completed"}

    batch = ToolBatch(
        concurrency_safe=True,
        items=[
            ToolExecutionItem(tool_call_id="a", tool="ReadChapter", input={"index": 1}, call_order=0),
            ToolExecutionItem(tool_call_id="b", tool="ReadChapter", input={"index": 2}, call_order=1),
        ],
    )

    with patch("app.agent.tools.chapter_catalog.fetch_chapter_summaries", new=fetch_mock):
        clear_chapter_rows_cache()
        async for _kind, _payload in execute_tool_batches(
            [batch],
            ctx,
            sequence=1,
            stream_tool_step=fake_stream_tool_step,
        ):
            pass

    assert fetch_mock.await_count == 1


@pytest.mark.asyncio
async def test_prime_chapter_rows_cache_reused(ctx: AgentRunContext):
    fetch_mock = AsyncMock(return_value=[{"id": "c1", "list_index": 1}])
    with patch("app.agent.tools.chapter_catalog.fetch_chapter_summaries", new=fetch_mock):
        clear_chapter_rows_cache()
        await prime_chapter_rows_cache(ctx)
        await load_chapter_rows(ctx)
        await load_chapter_rows(ctx)
        clear_chapter_rows_cache()
    assert fetch_mock.await_count == 1
