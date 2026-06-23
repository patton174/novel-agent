"""Streaming tool_use executor — run tools as they arrive (CC StreamingToolExecutor)."""

from __future__ import annotations

import asyncio
import logging
from collections import deque
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass, field
from typing import Any, Literal

from app.agent.harness.loop_support import apply_step_completed
from app.agent.harness.orchestration_contract import is_tool_concurrency_safe
from app.agent.harness.tool_orchestration import (
    ToolExecutionItem,
    ToolRunResult,
    _branch_context,
    _finalize_tool_run,
    _sort_runs_by_call_order,
)
from app.agent.schemas import AgentRunContext

logger = logging.getLogger(__name__)

StreamKind = Literal["event", "result", "ctx"]


@dataclass
class _TrackedTool:
    item: ToolExecutionItem
    status: Literal["queued", "executing", "completed", "discarded"] = "queued"
    task: asyncio.Task | None = None
    result: ToolRunResult | None = None


@dataclass
class StreamingToolExecutor:
    """Execute tool_use with CC concurrency rules; interleave SSE while LLM still streams."""

    ctx: AgentRunContext
    stream_tool_step: Callable[..., Any]
    sequence: int
    _queue: asyncio.Queue[tuple[StreamKind, Any]] = field(default_factory=asyncio.Queue)
    _tracks: list[_TrackedTool] = field(default_factory=list)
    _pending: deque[ToolExecutionItem] = field(default_factory=deque)
    _submitted_ids: set[str] = field(default_factory=set)
    _discarded: bool = False
    _finished: bool = False
    _working_ctx: AgentRunContext | None = None
    _schedule_lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    def __post_init__(self) -> None:
        self._working_ctx = self.ctx

    @property
    def submitted_ids(self) -> set[str]:
        return set(self._submitted_ids)

    def sync_call_orders(self, items: list[ToolExecutionItem]) -> None:
        """Apply prepare_execution_batch call_order to already-running tracks."""
        order_by_id = {i.tool_call_id: i.call_order for i in items}
        for track in self._tracks:
            if track.item.tool_call_id in order_by_id:
                track.item = ToolExecutionItem(
                    tool_call_id=track.item.tool_call_id,
                    tool=track.item.tool,
                    input=dict(track.item.input or {}),
                    call_order=order_by_id[track.item.tool_call_id],
                )

    async def submit(self, item: ToolExecutionItem) -> None:
        if self._discarded or self._finished:
            return
        if item.tool_call_id in self._submitted_ids:
            return
        self._submitted_ids.add(item.tool_call_id)
        self._pending.append(item)
        await self._schedule()

    async def finish_submitting(self) -> None:
        self._finished = True
        await self._schedule()

    def discard(self) -> None:
        self._discarded = True
        for track in self._tracks:
            if track.status in ("queued", "executing"):
                track.status = "discarded"
                if track.task and not track.task.done():
                    track.task.cancel()
        self._pending.clear()

    def discard_pending(self) -> None:
        """Cancel queued/in-flight tools; keep completed tracks and their results."""
        for track in self._tracks:
            if track.status in ("queued", "executing"):
                track.status = "discarded"
                if track.task and not track.task.done():
                    track.task.cancel()
        self._pending.clear()

    @property
    def completed_ids(self) -> set[str]:
        return {
            t.item.tool_call_id
            for t in self._tracks
            if t.status == "completed"
            and t.result is not None
            and not t.result.failed
        }

    @property
    def has_completed(self) -> bool:
        return bool(self.completed_ids)

    async def drain_available(self) -> AsyncIterator[tuple[StreamKind, Any]]:
        while not self._queue.empty():
            yield await self._queue.get()

    async def iter_combined(self) -> AsyncIterator[tuple[StreamKind, Any]]:
        """Same event shape as execute_tool_batches: event | result | ctx."""
        while True:
            await self._schedule()
            all_done = (
                self._finished
                and not self._pending
                and all(t.status in ("completed", "discarded") for t in self._tracks)
            )
            try:
                kind, payload = await asyncio.wait_for(
                    self._queue.get(),
                    timeout=0.02 if not all_done else 0.001,
                )
            except asyncio.TimeoutError:
                if all_done and self._queue.empty():
                    break
                continue
            yield kind, payload
            if all_done and self._queue.empty():
                from app.agent.tools.chapter_catalog import clear_chapter_rows_cache

                clear_chapter_rows_cache()
                break

    async def _schedule(self) -> None:
        async with self._schedule_lock:
            if self._discarded:
                return
            while self._pending:
                item = self._pending[0]
                if not self._can_execute(item):
                    if not is_tool_concurrency_safe(item.tool, item.input):
                        break
                    break
                self._pending.popleft()
                track = _TrackedTool(item=item, status="queued")
                self._tracks.append(track)
                track.status = "executing"
                track.task = asyncio.create_task(self._run_track(track))

    def _can_execute(self, item: ToolExecutionItem) -> bool:
        executing = [t for t in self._tracks if t.status == "executing"]
        if not executing:
            return True
        if not is_tool_concurrency_safe(item.tool, item.input):
            return False
        return all(
            is_tool_concurrency_safe(t.item.tool, t.item.input) for t in executing
        )

    async def _run_track(self, track: _TrackedTool) -> None:
        from app.agent.harness.loop_support import ToolStepOutcome
        from app.agent.tools.chapter_catalog import (
            CHAPTER_CATALOG_TOOLS,
            prime_chapter_rows_cache,
        )

        if self._discarded:
            track.status = "discarded"
            return
        item = track.item
        if item.tool in CHAPTER_CATALOG_TOOLS:
            await prime_chapter_rows_cache(self._working_ctx or self.ctx)
        seq = self.sequence + item.call_order * 50
        outcome = ToolStepOutcome()
        try:
            async for ev in self.stream_tool_step(
                _branch_context(self._working_ctx or self.ctx),
                item.tool,
                item.input,
                sequence=seq,
                outcome=outcome,
                step_id=item.tool_call_id or None,
            ):
                if self._discarded:
                    break
                await self._queue.put(("event", ev))
            run = _finalize_tool_run(
                item,
                self._working_ctx or self.ctx,
                outcome,
            )
            if outcome.failed:
                run = ToolRunResult(
                    item=item,
                    events=[],
                    result=outcome.result,
                    message_output=outcome.message_output,
                    failed=True,
                    error=outcome.error or "tool failed",
                    final_ctx=self._working_ctx or self.ctx,
                    silent_retry_attempts=outcome.silent_retry_attempts,
                )
            track.result = run
            track.status = "completed"
            if run.result and not run.failed:
                self._working_ctx = apply_step_completed(
                    self._working_ctx or self.ctx,
                    run.result.model_dump(),
                )
            await self._queue.put(("result", _sort_runs_by_call_order([run])))
            await self._queue.put(("ctx", self._working_ctx))
        except asyncio.CancelledError:
            track.status = "discarded"
            raise
        except Exception as exc:
            logger.exception(
                "streaming tool executor failed tool=%s id=%s",
                item.tool,
                item.tool_call_id,
            )
            run = ToolRunResult(
                item=item,
                events=[],
                result=None,
                message_output="",
                failed=True,
                error=str(exc),
                final_ctx=self._working_ctx or self.ctx,
            )
            track.result = run
            track.status = "completed"
            await self._queue.put(("result", _sort_runs_by_call_order([run])))
            await self._queue.put(("ctx", self._working_ctx))
        finally:
            await self._schedule()
