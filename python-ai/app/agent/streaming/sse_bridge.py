"""Execute CC tools and yield SSE events (orchestration layer)."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

from app.agent.harness.cc_visibility import (
    normalize_tool_name,
    should_emit_tool_progress_log,
    should_emit_tool_started,
    tool_display_name,
)
from app.agent.harness.events import build_tool_completed_sse_payload
from app.agent.harness.tool_display import chapter_write_progress_message
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

        if should_emit_tool_progress_log(tool) and tool in CHAPTER_STREAM_TOOLS and "/chapters/" in fp:
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

        result = await run_tool_use(tool, inp, ctx, tool_use_id=step_id)

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
