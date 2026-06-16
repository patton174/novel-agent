"""Batch orchestration continues after individual tool failures."""

from __future__ import annotations

import asyncio
from typing import Any

import pytest

from app.agent.harness.loop_support import ToolStepOutcome
from app.agent.harness.tool_orchestration import (
    ToolBatch,
    ToolExecutionItem,
    ToolRunResult,
    execute_tool_batches,
)
from app.agent.schemas import AgentRunContext


def _ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="run_test",
        session_id="sess",
        message_id="msg",
        user_id=1,
        novel_id="novel-1",
    )


async def _fake_stream_tool_step(
    ctx: AgentRunContext,
    tool: str,
    inp: dict[str, Any],
    *,
    sequence: int,
    outcome: ToolStepOutcome,
    step_id: str | None = None,
):
    if tool == "EditChapter":
        outcome.failed = True
        outcome.error = "<tool_use_error>old_string not found</tool_use_error>"
        return
    outcome.failed = False
    outcome.message_output = f"ok:{tool}"
    yield {
        "type": "tool.completed",
        "sequence": sequence,
        "payload": {"name": tool},
    }


@pytest.mark.asyncio
async def test_serial_batch_continues_after_failure():
    batch = ToolBatch(
        concurrency_safe=False,
        items=[
            ToolExecutionItem(tool_call_id="e1", tool="EditChapter", input={}),
            ToolExecutionItem(tool_call_id="r1", tool="ReadChapter", input={"chapter_id": "a"}),
        ],
    )
    results: list[ToolRunResult] = []
    async for kind, payload in execute_tool_batches(
        [batch],
        _ctx(),
        sequence=1,
        stream_tool_step=_fake_stream_tool_step,
    ):
        if kind == "result":
            results.extend(payload)
    assert len(results) == 2
    assert results[0].failed is True
    assert results[1].failed is False


@pytest.mark.asyncio
async def test_parallel_batch_continues_after_failure():
    batch = ToolBatch(
        concurrency_safe=True,
        items=[
            ToolExecutionItem(tool_call_id="r1", tool="ReadChapter", input={"chapter_id": "a"}),
            ToolExecutionItem(tool_call_id="r2", tool="ReadMemory", input={}),
        ],
    )

    async def flaky_parallel(
        ctx: AgentRunContext,
        tool: str,
        inp: dict[str, Any],
        *,
        sequence: int,
        outcome: ToolStepOutcome,
        step_id: str | None = None,
    ):
        if tool == "ReadMemory":
            raise RuntimeError("boom")
        async for ev in _fake_stream_tool_step(
            ctx, tool, inp, sequence=sequence, outcome=outcome, step_id=step_id
        ):
            yield ev

    results: list[ToolRunResult] = []
    async for kind, payload in execute_tool_batches(
        [batch],
        _ctx(),
        sequence=1,
        stream_tool_step=flaky_parallel,
    ):
        if kind == "result":
            results.extend(payload)
    by_id = {r.item.tool_call_id: r for r in results}
    assert len(results) == 2
    assert by_id["r1"].failed is False
    assert by_id["r2"].failed is True
