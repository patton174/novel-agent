"""Batch tool execution (CC toolOrchestration.runTools)."""

from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from typing import Any

from app.agent.schemas import AgentRunContext
from app.agent.tools.registry import partition_concurrency_safe
from app.agent.tools.run_tool_use import run_tool_use
from app.agent.tools.tool import ToolCallResult


@dataclass
class ToolUseItem:
    tool_call_id: str
    tool: str
    input: dict[str, Any]


@dataclass(frozen=True)
class ToolBatch:
    concurrency_safe: bool
    items: tuple[ToolUseItem, ...] = ()


@dataclass
class ToolRunOutcome:
    item: ToolUseItem
    result: ToolCallResult


def partition_tool_items(items: list[ToolUseItem]) -> list[ToolBatch]:
    batches: list[ToolBatch] = []
    for item in items:
        safe = partition_concurrency_safe(item.tool, item.input)
        if safe and batches and batches[-1].concurrency_safe:
            prev = batches[-1].items
            batches[-1] = ToolBatch(concurrency_safe=True, items=prev + (item,))
        else:
            batches.append(ToolBatch(concurrency_safe=safe, items=(item,)))
    return batches


def max_tool_concurrency() -> int:
    raw = os.environ.get("AGENT_MAX_TOOL_USE_CONCURRENCY", "10")
    try:
        return max(1, int(raw))
    except ValueError:
        return 10


async def run_tools_batch(
    items: list[ToolUseItem],
    ctx: AgentRunContext,
) -> list[ToolRunOutcome]:
    outcomes: list[ToolRunOutcome] = []
    working = ctx
    for batch in partition_tool_items(items):
        if batch.concurrency_safe and len(batch.items) > 1:
            sem = asyncio.Semaphore(max_tool_concurrency())

            async def _one(it: ToolUseItem) -> ToolRunOutcome:
                async with sem:
                    res = await run_tool_use(
                        it.tool, it.input, working, tool_use_id=it.tool_call_id
                    )
                    return ToolRunOutcome(item=it, result=res)

            results = await asyncio.gather(*(_one(i) for i in batch.items))
            outcomes.extend(results)
            for o in results:
                if o.result.context_patch:
                    patch = dict(working.context_patch or {})
                    patch.update(o.result.context_patch)
                    working = working.model_copy(update={"context_patch": patch})
        else:
            for it in batch.items:
                res = await run_tool_use(
                    it.tool, it.input, working, tool_use_id=it.tool_call_id
                )
                outcomes.append(ToolRunOutcome(item=it, result=res))
                if res.context_patch:
                    patch = dict(working.context_patch or {})
                    patch.update(res.context_patch)
                    working = working.model_copy(update={"context_patch": patch})
    return outcomes
