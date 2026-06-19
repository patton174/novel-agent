"""StreamingToolExecutor — incremental submit + drain."""

from __future__ import annotations

import asyncio
from unittest.mock import MagicMock

import pytest

from app.agent.harness.tool_orchestration import ToolExecutionItem
from app.agent.tools.streaming_executor import StreamingToolExecutor


def _item(name: str, tool_id: str, *, call_order: int = 0) -> ToolExecutionItem:
    return ToolExecutionItem(
        tool_call_id=tool_id,
        tool=name,
        input={"chapter_id": "1"},
        call_order=call_order,
    )


@pytest.mark.asyncio
async def test_submit_drain_and_iter_combined():
    ctx = MagicMock()
    ctx.session_id = "s1"
    ctx.novel_id = "n1"
    ctx.user_id = "u1"

    async def fake_stream(_ctx, _tool, _inp, **_kw):
        yield {"type": "tool.started", "tool_id": _kw.get("step_id")}

    ex = StreamingToolExecutor(ctx=ctx, stream_tool_step=fake_stream, sequence=10)
    await ex.submit(_item("ReadChapter", "t1", call_order=0))
    await ex.submit(_item("ReadChapter", "t2", call_order=1))
    await ex.finish_submitting()

    combined = []
    async for kind, payload in ex.iter_combined():
        combined.append((kind, payload))

    events = [p for k, p in combined if k == "event"]
    results = [p for k, p in combined if k == "result"]
    assert len(events) >= 2
    assert len(results) >= 2


@pytest.mark.asyncio
async def test_sync_call_orders():
    ctx = MagicMock()

    async def noop_stream(*_a, **_k):
        if False:
            yield {}

    ex = StreamingToolExecutor(ctx=ctx, stream_tool_step=noop_stream, sequence=0)
    await ex.submit(_item("ReadChapter", "t1", call_order=99))
    ex.sync_call_orders([_item("ReadChapter", "t1", call_order=0)])
    assert ex._tracks[0].item.call_order == 0


@pytest.mark.asyncio
async def test_discard_cancels_pending():
    ctx = MagicMock()
    started = asyncio.Event()

    async def slow_stream(*_a, **_k):
        started.set()
        await asyncio.sleep(10)
        yield {"type": "tool.completed"}

    ex = StreamingToolExecutor(ctx=ctx, stream_tool_step=slow_stream, sequence=0)
    await ex.submit(_item("ReadChapter", "t1"))
    await ex.finish_submitting()
    await asyncio.wait_for(started.wait(), timeout=2)
    ex.discard()
    assert ex._discarded is True
