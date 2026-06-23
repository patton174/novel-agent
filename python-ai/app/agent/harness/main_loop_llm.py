"""Stream bind_tools turns for the agent main loop (reasoning SSE + AIMessage)."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from langchain_core.messages import AIMessage, AIMessageChunk

from app.agent.harness.llm_trace import extract_cache_usage, log_llm_exchange
from app.agent.harness.tool_call_chunk_accumulator import ToolCallChunkAccumulator
from app.agent.harness.tool_use_ready import build_validated_tool_use_events
from app.agent.harness.visible_text_channel import polish_visible_text
from app.agent.schemas import AgentRunContext
from app.core.llm_chunk_split import LlmChunkSplitter
from app.runtime.events import build_event

logger = logging.getLogger(__name__)


@dataclass
class MainLoopLlmStreamState:
    run_id: str
    session_id: str
    message_id: str
    step_id: str
    sequence: int
    reasoning_step_id: str
    reasoning_open: bool = False


@dataclass
class _VisibleTextForwarder:
    """Stream visible assistant text as message.delta."""

    def feed(self, text: str) -> list[str]:
        if not text:
            return []
        piece = polish_visible_text(text.replace("\ufffd", ""))
        return [piece] if piece else []

    def flush(self) -> list[str]:
        return []


async def _emit_reasoning_completed(
    state: MainLoopLlmStreamState,
) -> AsyncIterator[dict[str, Any]]:
    """Close open reasoning stream once — before tool_use SSE so UI think ends with reasoning."""
    if not state.reasoning_open:
        return
    state.reasoning_open = False
    yield build_event(
        event_type="reasoning.completed",
        run_id=state.run_id,
        session_id=state.session_id,
        message_id=state.message_id,
        step_id=state.reasoning_step_id,
        sequence=state.sequence,
        payload={},
    )
    state.sequence += 1


async def _emit_message_segment_completed(
    state: MainLoopLlmStreamState,
    *,
    message_step_id: str,
    message_open: list[bool],
    delivery: bool,
) -> AsyncIterator[dict[str, Any]]:
    """Close visible-text segment; delivery=false → 编排正文, delivery=true → 回复正文."""
    if not message_open[0]:
        return
    message_open[0] = False
    yield build_event(
        event_type="message.completed",
        run_id=state.run_id,
        session_id=state.session_id,
        message_id=state.message_id,
        step_id=message_step_id,
        sequence=state.sequence,
        payload={"role": "assistant", "delivery": delivery},
    )
    state.sequence += 1


async def _yield_validated_tool_use_events(
    *,
    stream_state: MainLoopLlmStreamState,
    ready: Any,
    ctx: AgentRunContext,
    planning_step_id: str,
    message_step_id: str,
    message_open: list[bool],
) -> AsyncIterator[dict[str, Any]]:
    async for ev in _emit_message_segment_completed(
        stream_state,
        message_step_id=message_step_id,
        message_open=message_open,
        delivery=False,
    ):
        yield ev
    async for ev in _emit_reasoning_completed(stream_state):
        yield ev
    events, stream_state.sequence = build_validated_tool_use_events(
        ready=ready,
        ctx=ctx,
        run_id=ctx.run_id,
        session_id=ctx.session_id,
        message_id=ctx.message_id,
        step_id=planning_step_id,
        sequence=stream_state.sequence,
    )
    for ev in events:
        yield ev


async def _emit_reasoning_delta(
    state: MainLoopLlmStreamState,
    text: str,
) -> AsyncIterator[dict[str, Any]]:
    piece = (text or "").replace("\ufffd", "")
    if not piece:
        return
    if not state.reasoning_open:
        state.reasoning_open = True
        yield build_event(
            event_type="reasoning.started",
            run_id=state.run_id,
            session_id=state.session_id,
            message_id=state.message_id,
            step_id=state.reasoning_step_id,
            sequence=state.sequence,
            payload={"title": "推理中"},
        )
        state.sequence += 1
    yield build_event(
        event_type="reasoning.delta",
        run_id=state.run_id,
        session_id=state.session_id,
        message_id=state.message_id,
        step_id=state.reasoning_step_id,
        sequence=state.sequence,
        payload={"text": piece},
    )
    state.sequence += 1


async def _emit_visible_message_delta(
    state: MainLoopLlmStreamState,
    text: str,
    *,
    message_step_id: str,
    message_open: list[bool],
) -> AsyncIterator[dict[str, Any]]:
    """Forward visible assistant text to the client as message.delta."""
    piece = (text or "").replace("\ufffd", "")
    if not piece:
        return
    if not message_open[0]:
        message_open[0] = True
        yield build_event(
            event_type="message.started",
            run_id=state.run_id,
            session_id=state.session_id,
            message_id=state.message_id,
            step_id=message_step_id,
            sequence=state.sequence,
            payload={"role": "assistant"},
        )
        state.sequence += 1
    yield build_event(
        event_type="message.delta",
        run_id=state.run_id,
        session_id=state.session_id,
        message_id=state.message_id,
        step_id=message_step_id,
        sequence=state.sequence,
        payload={"text": piece},
    )
    state.sequence += 1


def _gathered_has_tool_calls(gathered: AIMessageChunk | AIMessage | None) -> bool:
    if gathered is None:
        return False
    return bool(getattr(gathered, "tool_calls", None) or [])


async def stream_bind_tools_turn(
    llm: Any,
    messages: list,
    *,
    ctx: AgentRunContext,
    planning_step_id: str,
    sequence: int,
) -> AsyncIterator[dict[str, Any] | AIMessage]:
    """Yield reasoning.* events, then the final AIMessage with tool_calls."""
    stream_state = MainLoopLlmStreamState(
        run_id=ctx.run_id,
        session_id=ctx.session_id,
        message_id=ctx.message_id,
        step_id=planning_step_id,
        sequence=sequence,
        reasoning_step_id=f"step_reasoning_{uuid4().hex[:8]}",
    )
    splitter = LlmChunkSplitter(emit_reasoning=True)
    gathered: AIMessageChunk | None = None
    tool_accumulator = ToolCallChunkAccumulator()
    message_step_id = f"step_msg_{uuid4().hex[:8]}"
    message_open = [False]
    forwarder = _VisibleTextForwarder()

    try:
        async for chunk in llm.astream(messages):
            if gathered is None:
                gathered = chunk
            else:
                gathered = gathered + chunk

            raw = getattr(chunk, "content", chunk)
            for kind, text in splitter.feed(raw):
                if kind == "reasoning":
                    async for ev in _emit_reasoning_delta(stream_state, text):
                        yield ev
                elif kind == "text":
                    for piece in forwarder.feed(text):
                        async for ev in _emit_visible_message_delta(
                            stream_state,
                            piece,
                            message_step_id=message_step_id,
                            message_open=message_open,
                        ):
                            yield ev

            for ready in tool_accumulator.feed(chunk):
                async for ev in _yield_validated_tool_use_events(
                    stream_state=stream_state,
                    ready=ready,
                    ctx=ctx,
                    planning_step_id=planning_step_id,
                    message_step_id=message_step_id,
                    message_open=message_open,
                ):
                    yield ev

        async for ev in _emit_reasoning_completed(stream_state):
            yield ev

        for piece in forwarder.flush():
            async for ev in _emit_visible_message_delta(
                stream_state,
                piece,
                message_step_id=message_step_id,
                message_open=message_open,
            ):
                yield ev

        has_tool_calls = _gathered_has_tool_calls(gathered)

        if gathered is None:
            yield AIMessage(content="")
            return

        if has_tool_calls:
            async for ev in _emit_message_segment_completed(
                stream_state,
                message_step_id=message_step_id,
                message_open=message_open,
                delivery=False,
            ):
                yield ev
        else:
            async for ev in _emit_message_segment_completed(
                stream_state,
                message_step_id=message_step_id,
                message_open=message_open,
                delivery=True,
            ):
                yield ev

        final_tool_calls = getattr(gathered, "tool_calls", None) or []
        for ready in tool_accumulator.feed_gathered_tool_calls(final_tool_calls):
            async for ev in _yield_validated_tool_use_events(
                stream_state=stream_state,
                ready=ready,
                ctx=ctx,
                planning_step_id=planning_step_id,
                message_step_id=message_step_id,
                message_open=message_open,
            ):
                yield ev

        log_llm_exchange(
            phase="main_loop",
            run_id=ctx.run_id,
            messages=messages,
            raw_response=gathered,
            extra={
                "planning_step_id": planning_step_id,
                "has_tool_calls": has_tool_calls,
            },
        )

        usage_fields = extract_cache_usage(gathered)
        model_name = None
        meta = getattr(gathered, "response_metadata", None) or {}
        if isinstance(meta, dict):
            model_name = meta.get("model") or meta.get("model_name")
        from app.billing.reporter import report_llm_usage

        await report_llm_usage(
            user_id=ctx.user_id,
            run_id=ctx.run_id,
            session_id=ctx.session_id,
            model=str(model_name) if model_name else None,
            usage=usage_fields,
            step_index=stream_state.sequence,
        )

        if isinstance(gathered, AIMessage):
            yield gathered
            return

        yield AIMessage(
            content=gathered.content,
            tool_calls=getattr(gathered, "tool_calls", None) or [],
            additional_kwargs=getattr(gathered, "additional_kwargs", None) or {},
            response_metadata=getattr(gathered, "response_metadata", None) or {},
            id=getattr(gathered, "id", None),
        )
    except Exception:
        async for ev in _emit_reasoning_completed(stream_state):
            yield ev
        raise
