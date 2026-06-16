"""Partition tool_use batches and run read-only tools in parallel, writes serially."""

from __future__ import annotations

import asyncio
import logging
import os
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any, Literal

from app.agent.harness.cc_visibility import normalize_tool_name
from app.agent.harness.loop_support import apply_step_completed
from app.agent.harness.orchestration_contract import is_tool_concurrency_safe
from app.agent.schemas import AgentRunContext, StepResult

logger = logging.getLogger(__name__)

StreamKind = Literal["event", "result", "ctx"]


def max_tool_use_concurrency() -> int:
    raw = (
        os.environ.get("AGENT_MAX_TOOL_USE_CONCURRENCY")
        or os.environ.get("MAX_TOOL_USE_CONCURRENCY")
        or "10"
    )
    try:
        value = int(raw)
    except ValueError:
        value = 10
    return max(1, value)


@dataclass(frozen=True)
class ToolExecutionItem:
    tool_call_id: str
    tool: str
    input: dict[str, Any]


@dataclass
class ToolBatch:
    """Consecutive tools sharing the same concurrency mode (order preserved)."""

    concurrency_safe: bool
    items: list[ToolExecutionItem] = field(default_factory=list)


def partition_tool_calls(items: list[ToolExecutionItem]) -> list[ToolBatch]:
    batches: list[ToolBatch] = []
    for item in items:
        safe = is_tool_concurrency_safe(item.tool, item.input)
        if safe and batches and batches[-1].concurrency_safe:
            batches[-1].items.append(item)
        else:
            batches.append(ToolBatch(concurrency_safe=safe, items=[item]))
    return batches


@dataclass
class ToolRunResult:
    item: ToolExecutionItem
    events: list[dict[str, Any]]
    result: StepResult | None
    message_output: str
    failed: bool
    error: str
    final_ctx: AgentRunContext
    silent_retry_attempts: int = 0


def _branch_context(ctx: AgentRunContext) -> AgentRunContext:
    patch = ctx.context_patch if isinstance(ctx.context_patch, dict) else {}
    return ctx.model_copy(update={"context_patch": dict(patch)})


def _finalize_tool_run(
    item: ToolExecutionItem,
    ctx: AgentRunContext,
    outcome: Any,
) -> ToolRunResult:
    from app.agent.harness.tool_result_routing import tool_message_text

    display_content = None
    reason = None
    if outcome.result:
        if outcome.result.display and outcome.result.display.content:
            display_content = str(outcome.result.display.content)
        reason = outcome.result.reason
    out_text = tool_message_text(
        message_output=outcome.message_output or "",
        step_result_display_content=display_content,
        step_result_reason=reason,
    )
    return ToolRunResult(
        item=item,
        events=[],
        result=outcome.result,
        message_output=out_text,
        failed=outcome.failed,
        error=outcome.error,
        final_ctx=ctx,
        silent_retry_attempts=int(getattr(outcome, "silent_retry_attempts", 0) or 0),
    )


async def _stream_single_tool(
    item: ToolExecutionItem,
    ctx: AgentRunContext,
    *,
    sequence: int,
    stream_tool_step,
    startup_barrier: asyncio.Barrier | None = None,
) -> AsyncIterator[tuple[Literal["event", "result"], Any]]:
    """Yield SSE events as they are produced; final tuple is ToolRunResult."""
    from app.agent.harness.loop_support import ToolStepOutcome

    step_id = (item.tool_call_id or "").strip() or None
    outcome = ToolStepOutcome()
    async for ev in stream_tool_step(
        ctx,
        item.tool,
        item.input,
        sequence=sequence,
        outcome=outcome,
        step_id=step_id,
    ):
        if (
            startup_barrier is not None
            and isinstance(ev, dict)
            and ev.get("type") == "subagent.started"
        ):
            yield ("event", ev)
            await startup_barrier.wait()
            continue
        yield ("event", ev)
    yield ("result", _finalize_tool_run(item, ctx, outcome))


async def _stream_parallel_batch(
    batch: ToolBatch,
    ctx: AgentRunContext,
    *,
    sequence: int,
    stream_tool_step,
) -> AsyncIterator[tuple[StreamKind, Any]]:
    """Run a parallel read batch; interleave events as each tool produces them."""
    limit = max_tool_use_concurrency()
    sem = asyncio.Semaphore(limit)
    queue: asyncio.Queue[tuple[str, Any]] = asyncio.Queue()

    logger.info(
        "parallel tool batch tools=%s concurrency=%s",
        [i.tool for i in batch.items],
        limit,
    )

    use_startup_barrier = len(batch.items) > 1 and all(
        normalize_tool_name(item.tool) == "Agent" for item in batch.items
    )
    startup_barrier = (
        asyncio.Barrier(len(batch.items)) if use_startup_barrier else None
    )

    async def _runner(idx: int, item: ToolExecutionItem) -> None:
        async with sem:
            try:
                async for kind, payload in _stream_single_tool(
                    item,
                    _branch_context(ctx),
                    sequence=sequence + idx * 50,
                    stream_tool_step=stream_tool_step,
                    startup_barrier=startup_barrier,
                ):
                    if kind == "event":
                        await queue.put(("event", payload))
                    else:
                        await queue.put(("result", idx, payload))
            except Exception as exc:
                logger.exception(
                    "parallel tool failed tool=%s id=%s",
                    item.tool,
                    item.tool_call_id,
                )
                await queue.put(
                    (
                        "result",
                        idx,
                        ToolRunResult(
                            item=item,
                            events=[],
                            result=None,
                            message_output="",
                            failed=True,
                            error=str(exc),
                            final_ctx=_branch_context(ctx),
                        ),
                    )
                )

    tasks = [
        asyncio.create_task(_runner(idx, item))
        for idx, item in enumerate(batch.items)
    ]
    results: list[ToolRunResult | None] = [None] * len(batch.items)
    done_count = 0
    try:
        while done_count < len(batch.items):
            tag, *rest = await queue.get()
            if tag == "event":
                yield ("event", rest[0])
            elif tag == "result":
                idx, run = rest[0], rest[1]
                results[idx] = run
                done_count += 1
    finally:
        await asyncio.gather(*tasks, return_exceptions=True)

    ordered = [r for r in results if r is not None]
    if len(ordered) != len(batch.items):
        raise RuntimeError("parallel tool batch missing results")
    yield ("result", ordered)


async def execute_tool_batches(
    batches: list[ToolBatch],
    ctx: AgentRunContext,
    *,
    sequence: int,
    stream_tool_step,
) -> AsyncIterator[tuple[StreamKind, Any]]:
    seq = sequence
    working_ctx = ctx

    for batch in batches:
        if batch.concurrency_safe and len(batch.items) > 1:
            async for kind, payload in _stream_parallel_batch(
                batch,
                working_ctx,
                sequence=seq,
                stream_tool_step=stream_tool_step,
            ):
                if kind == "event":
                    yield ("event", payload)
                    continue
                runs: list[ToolRunResult] = payload
                for run in runs:
                    if run.result and not run.failed:
                        working_ctx = apply_step_completed(
                            working_ctx, run.result.model_dump()
                        )
                yield ("result", runs)
                yield ("ctx", working_ctx)
        else:
            batch_results: list[ToolRunResult] = []
            for item in batch.items:
                async for kind, payload in _stream_single_tool(
                    item,
                    working_ctx,
                    sequence=seq,
                    stream_tool_step=stream_tool_step,
                ):
                    if kind == "event":
                        yield ("event", payload)
                    else:
                        run = payload
                        batch_results.append(run)
                        if run.result and not run.failed:
                            working_ctx = apply_step_completed(
                                working_ctx, run.result.model_dump()
                            )
            yield ("result", batch_results)
            yield ("ctx", working_ctx)
