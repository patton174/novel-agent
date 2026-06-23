"""Execute CC tools and yield SSE events (orchestration layer)."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from typing import Any, Literal
from uuid import uuid4

from app.agent.harness.cc_visibility import (
    normalize_tool_name,
    should_emit_tool_started,
    tool_display_name,
)
from app.agent.harness.events import build_tool_completed_sse_payload
from app.agent.harness.tool_display import (
    chapter_write_progress_message,
    format_tool_display_excerpt,
    memory_mutation_progress_message,
    read_progress_message,
)
from app.agent.schemas import AgentRunContext, StepRequest
from app.agent.streaming.chapter_stream_bridge import (
    CHAPTER_STREAM_TOOLS,
    ChapterStreamResult,
    run_chapter_stream_pipeline,
    should_stream_chapter_write,
)
from app.agent.streaming.tool_side_effect import failure_event_sequence
from app.agent.tools.run_tool_use import run_tool_use
from app.agent.tools.tool import ToolCallResult
from app.runtime.events import build_event
from app.runtime.streaming import emit_sse_text_chunks

logger = logging.getLogger(__name__)

_MESSAGE_DELTA_INTERVAL = 0
_READ_PROGRESS_TOOLS = frozenset(
    {"ReadChapter", "ListChapters", "ReadMemory", "ListMemory", "SearchKnowledge"}
)
_MEMORY_MUTATION_PROGRESS_TOOLS = frozenset(
    {"CreateMemory", "UpdateMemoryFields", "UpdateMemoryContent", "UpdateMemoryMeta", "MoveMemory", "DeleteMemory"}
)
_EXCERPT_STREAM_INTERVAL = 0
_READ_PULSE_INTERVAL = 0.14
_READ_PULSE_MAX = 180


async def _run_read_chapter_content_stream(
    inp: dict[str, Any],
    ctx: AgentRunContext,
    *,
    step_id: str,
    run_id: str,
    session_id: str,
    message_id: str,
    seq: int,
) -> AsyncIterator[tuple[Literal["event", "result"], Any]]:
    """ReadChapter: one UI progress (chapter label only); body fetched without content SSE."""
    from app.agent.tools.prepare_tool_input import prepare_tool_input
    from app.agent.tools.schemas import ReadChapterInput

    prepared, prep_err = prepare_tool_input("ReadChapter", inp, ctx)
    if prepared is None:
        yield (
            "result",
            ToolCallResult(
                content=f"<tool_use_error>{prep_err or 'invalid ReadChapter input'}</tool_use_error>",
                is_error=True,
            ),
        )
        return

    parsed = prepared.parsed
    assert isinstance(parsed, ReadChapterInput)
    if parsed.title:
        label = f"正在读取《{parsed.title.strip()}》…"
    elif parsed.index is not None:
        label = f"正在读取第 {parsed.index} 章…"
    elif parsed.chapter_id:
        cid = str(parsed.chapter_id).strip()
        label = f"正在读取章节 {cid[:8]}…"
    else:
        label = "正在读取章节…"

    yield (
        "event",
        build_event(
            event_type="tool.progress",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload={
                "name": "ReadChapter",
                "message": label,
                "live": True,
            },
        ),
    )

    result = await run_tool_use("ReadChapter", inp, ctx, tool_use_id=step_id)
    yield ("result", result)


async def _run_read_tool_with_live_progress(
    tool: str,
    inp: dict[str, Any],
    ctx: AgentRunContext,
    *,
    step_id: str,
    run_id: str,
    session_id: str,
    message_id: str,
    seq: int,
) -> AsyncIterator[tuple[Literal["event", "result"], Any]]:
    """HTTP 阻塞期间周期性推送 tool.progress，返回后再流式 excerpt。"""
    task = asyncio.create_task(run_tool_use(tool, inp, ctx, tool_use_id=step_id))
    label = read_progress_message(tool, inp)
    pulse = 0
    while not task.done():
        if pulse >= _READ_PULSE_MAX:
            break
        msg = label if pulse == 0 else f"{label.rstrip('…')}（读取中）"
        yield (
            "event",
            build_event(
                event_type="tool.progress",
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=step_id,
                sequence=seq,
                payload={"name": tool, "message": msg, "live": True},
            ),
        )
        seq += 1
        pulse += 1
        await asyncio.sleep(_READ_PULSE_INTERVAL)
    result = await task
    yield ("result", result)


async def _yield_message_deltas(
    text: str,
    *,
    run_id: str,
    session_id: str,
    message_id: str,
    step_id: str,
    seq: int,
) -> AsyncIterator[tuple[dict[str, Any], int]]:
    """Emit message.delta events in small chunks for chat timeline streaming."""
    if not (text or "").strip():
        return
    current_seq = seq
    for delta in emit_sse_text_chunks(text, min_size=8, max_size=24):
        yield (
            build_event(
                event_type="message.delta",
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=step_id,
                sequence=current_seq,
                payload={"text": delta},
            ),
            current_seq + 1,
        )
        current_seq += 1
        await asyncio.sleep(_MESSAGE_DELTA_INTERVAL)


def tool_result_to_step_payload(
    tool: str, result: ToolCallResult
) -> dict[str, Any]:
    from app.agent.harness.tool_result_routing import build_model_step_payload

    return build_model_step_payload(tool, result)


async def stream_cc_tool_step(
    ctx: AgentRunContext,
    tool: str,
    tool_input: dict[str, Any],
    *,
    sequence: int,
    step_id: str | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """Run one tool; yield SSE events; final event is step.completed or step.failed."""
    run_id = ctx.run_id
    session_id = ctx.session_id
    message_id = ctx.message_id
    step_id = (step_id or "").strip() or f"step_{uuid4().hex}"
    seq = sequence
    inp = dict(tool_input or {})
    result: ToolCallResult | None = None

    yield build_event(
        event_type="step.started",
        run_id=run_id,
        session_id=session_id,
        message_id=message_id,
        step_id=step_id,
        sequence=seq,
        payload={"tool": tool, "step_index": ctx.step_index},
    )
    seq += 1

    fp = str(inp.get("file_path") or "")
    stream_chapter = should_stream_chapter_write(tool, inp)
    live_read_excerpt = False

    if should_emit_tool_started(tool):
        fp_early = fp or str(inp.get("path") or "")
        yield build_event(
            event_type="tool.started",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload={
                "name": tool,
                "display_name": tool_display_name(tool, inp),
                **({"file_path": fp_early} if fp_early else {}),
            },
        )
        seq += 1
        await asyncio.sleep(0)

    if stream_chapter:
        chapter_outcome = ChapterStreamResult()
        async for ev in run_chapter_stream_pipeline(
            ctx=ctx,
            tool=tool,
            inp=inp,
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            outcome=chapter_outcome,
        ):
            yield ev
        if chapter_outcome.failed:
            for ev in chapter_outcome.fail_events:
                yield ev
            return
        if chapter_outcome.result is None:
            return
        result = chapter_outcome.result
    else:
        if normalize_tool_name(tool) == "Agent":
            from app.agent.harness.subagent_sse import stream_subagent_tool

            async for ev in stream_subagent_tool(
                ctx,
                inp,
                parent_step_id=step_id,
                sequence=seq,
            ):
                yield ev
            return

        fp = str(inp.get("file_path") or "")
        if tool in CHAPTER_STREAM_TOOLS and "/chapters/" in fp:
            yield build_event(
                event_type="tool.progress",
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=step_id,
                sequence=seq,
                payload={
                    "name": tool,
                    "message": chapter_write_progress_message(tool, inp, ctx),
                },
            )
            seq += 1
        elif tool in _READ_PROGRESS_TOOLS:
            await asyncio.sleep(0)
            if normalize_tool_name(tool) == "ReadChapter":
                async for kind, payload in _run_read_chapter_content_stream(
                    inp,
                    ctx,
                    step_id=step_id,
                    run_id=run_id,
                    session_id=session_id,
                    message_id=message_id,
                    seq=seq,
                ):
                    if kind == "event":
                        yield payload
                        seq += 1
                    else:
                        result = payload
            else:
                yield build_event(
                    event_type="tool.progress",
                    run_id=run_id,
                    session_id=session_id,
                    message_id=message_id,
                    step_id=step_id,
                    sequence=seq,
                    payload={
                        "name": tool,
                        "message": read_progress_message(tool, inp),
                    },
                )
                seq += 1
                async for kind, payload in _run_read_tool_with_live_progress(
                    tool,
                    inp,
                    ctx,
                    step_id=step_id,
                    run_id=run_id,
                    session_id=session_id,
                    message_id=message_id,
                    seq=seq,
                ):
                    if kind == "event":
                        yield payload
                        seq += 1
                    else:
                        result = payload
        elif tool in _MEMORY_MUTATION_PROGRESS_TOOLS:
            yield build_event(
                event_type="tool.progress",
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=step_id,
                sequence=seq,
                payload={
                    "name": tool,
                    "message": memory_mutation_progress_message(tool, inp),
                },
            )
            seq += 1
            await asyncio.sleep(0)
        if tool not in _READ_PROGRESS_TOOLS:
            result = await run_tool_use(tool, inp, ctx, tool_use_id=step_id)
        if not result.is_error and tool in _READ_PROGRESS_TOOLS and not live_read_excerpt:
            excerpt = format_tool_display_excerpt(
                tool, result.content or "", fp, tool_input=inp
            )
            if excerpt and len(excerpt) > 24:
                acc = ""
                for piece in emit_sse_text_chunks(excerpt, min_size=6, max_size=18):
                    acc += piece
                    yield build_event(
                        event_type="tool.progress",
                        run_id=run_id,
                        session_id=session_id,
                        message_id=message_id,
                        step_id=step_id,
                        sequence=seq,
                        payload={"name": tool, "display_excerpt": acc},
                    )
                    seq += 1
                    await asyncio.sleep(_EXCERPT_STREAM_INTERVAL)
        if tool == "AskUser" and result.action == "wait":
            yield build_event(
                event_type="run.waiting",
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=step_id,
                sequence=seq,
                payload={"interaction": result.interaction or {}},
            )
            seq += 1

    assert result is not None

    if normalize_tool_name(tool) == "TodoWrite":
        patch = result.context_patch if isinstance(result.context_patch, dict) else {}
        todos = patch.get("todos")
        if isinstance(todos, list) and todos:
            yield build_event(
                event_type="tool.progress",
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=step_id,
                sequence=seq,
                payload={
                    "name": tool,
                    "todos": todos,
                    "context_patch": {"todos": todos},
                },
            )
            seq += 1

    if result.is_error:
        fail_events, seq = failure_event_sequence(
            tool=tool,
            inp=inp,
            result=result,
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
        )
        for ev in fail_events:
            yield ev
        return

    if normalize_tool_name(tool) == "output":
        body = (result.content or "").strip()
        if body:
            message_step_id = f"step_msg_{uuid4().hex[:8]}"
            yield build_event(
                event_type="message.started",
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=message_step_id,
                sequence=seq,
                payload={"role": "assistant", "delivery": True},
            )
            seq += 1
            async for ev, next_seq in _yield_message_deltas(
                body,
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=message_step_id,
                seq=seq,
            ):
                yield ev
                seq = next_seq
            yield build_event(
                event_type="message.completed",
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=message_step_id,
                sequence=seq,
                payload={"role": "assistant", "delivery": True},
            )
            seq += 1

    completed_payload = build_tool_completed_sse_payload(
        tool,
        content=result.content or "",
        failed=result.is_error,
        interaction=result.interaction,
        tool_input=inp,
        context_patch=result.context_patch,
    )
    yield build_event(
        event_type="tool.completed",
        run_id=run_id,
        session_id=session_id,
        message_id=message_id,
        step_id=step_id,
        sequence=seq,
        payload=completed_payload,
    )
    seq += 1

    payload = tool_result_to_step_payload(tool, result)
    yield build_event(
        event_type="step.completed",
        run_id=run_id,
        session_id=session_id,
        message_id=message_id,
        step_id=step_id,
        sequence=seq,
        payload=payload,
    )


async def stream_tool_step_legacy_compat(
    req: StepRequest,
    *,
    sequence: int,
) -> AsyncIterator[dict[str, Any]]:
    async for ev in stream_cc_tool_step(
        req.context,
        req.tool or "Read",
        dict(req.tool_input or {}),
        sequence=sequence,
    ):
        yield ev
