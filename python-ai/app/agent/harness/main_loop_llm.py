"""Stream bind_tools turns for the agent main loop (reasoning SSE + AIMessage)."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any, Literal
from uuid import uuid4

from langchain_core.messages import AIMessage, AIMessageChunk

from app.agent.harness.llm_trace import extract_cache_usage, log_llm_exchange
from app.agent.harness.visible_text_channel import (
    VisibleChannel,
    classify_visible_channel_prefix,
    could_be_delivery_prefix,
    extract_channel_body_from_text,
    extract_delivery_body_from_text,
    polish_visible_text,
    prefix_scan_state,
)
from app.agent.schemas import AgentRunContext
from app.core.llm_chunk_split import LlmChunkSplitter
from app.core.llm_content import extract_llm_text
from app.runtime.events import build_event
from app.runtime.streaming import emit_sse_text_chunks

logger = logging.getLogger(__name__)

_REASONING_DELTA_INTERVAL_SEC = 0.022

VisibleRouteMode = Literal["pending", "delivery"]


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
class _VisibleTextRouter:
    """Route visible LLM text by channel prefix.

    - `[交付]` / aliases → delivery (message.delta).
    - Unprefixed or `[编排]` aliases → reasoning.delta (UI think + last-line summary).
    """

    delivery_step_id: str
    delivery_open: list[bool]
    mode: VisibleRouteMode = "pending"
    pending_parts: list[str] = field(default_factory=list)
    prefix_scan_active: bool = True
    prefix_hold: str = ""
    route_locked_by_prefix: bool = False
    delivery_emitted: bool = False

    @property
    def pending_text(self) -> str:
        return "".join(self.pending_parts)

    def lock_mode(self, mode: VisibleRouteMode) -> None:
        self.mode = mode

    def _try_lock_piece(self, piece: str) -> tuple[VisibleChannel | None, str]:
        channel, body, matched = self._classify_with_match(piece)
        if matched and channel == "delivery":
            self.route_locked_by_prefix = True
            self.lock_mode("delivery")
            return channel, body
        if matched and channel == "orchestration":
            return channel, body

        inline_delivery = extract_channel_body_from_text(piece, "delivery")
        if inline_delivery:
            self.route_locked_by_prefix = True
            self.lock_mode("delivery")
            return "delivery", inline_delivery
        inline_orch = extract_channel_body_from_text(piece, "orchestration")
        if inline_orch:
            return "orchestration", inline_orch
        return None, ""

    def _discard_unprefixed(self) -> None:
        self.pending_parts.clear()

    def _resolve_prefix_hold(self) -> str | None:
        """Finalize prefix scan; return text to route or None if still partial."""
        if not self.prefix_scan_active:
            return None

        held = self.prefix_hold
        self.prefix_hold = ""
        self.prefix_scan_active = False

        if not held:
            return ""

        channel, body, matched = self._classify_with_match(held)
        if matched and channel == "delivery":
            self.route_locked_by_prefix = True
            self.lock_mode("delivery")
            return body
        if matched and channel == "orchestration":
            return body

        scan = prefix_scan_state(held)
        if scan == "partial":
            self.prefix_scan_active = True
            self.prefix_hold = held
            return None

        return held

    @staticmethod
    def _classify_with_match(text: str) -> tuple[VisibleChannel | None, str, bool]:
        channel, body = classify_visible_channel_prefix(text)
        if channel is not None:
            return channel, body, True
        return None, text, False

    def _ingest_through_prefix_scan(self, text: str) -> list[str]:
        if not text:
            return []

        if not self.prefix_scan_active:
            return [text]

        self.prefix_hold += text
        channel, body, matched = self._classify_with_match(self.prefix_hold)
        if matched and channel == "delivery":
            self.prefix_scan_active = False
            self.prefix_hold = ""
            self.route_locked_by_prefix = True
            self.lock_mode("delivery")
            return [body] if body else []
        if matched and channel == "orchestration":
            self.prefix_scan_active = False
            self.prefix_hold = ""
            return [body] if body else []

        if prefix_scan_state(self.prefix_hold) == "partial":
            return []

        held = self.prefix_hold
        self.prefix_hold = ""
        self.prefix_scan_active = False
        return [held] if held else []

    async def _emit_reasoning(
        self,
        stream_state: MainLoopLlmStreamState,
        text: str,
    ) -> AsyncIterator[dict[str, Any]]:
        piece = polish_visible_text((text or "").replace("\ufffd", ""))
        if not piece:
            return
        async for ev in _emit_reasoning_delta(stream_state, piece):
            yield ev

    async def _emit_delivery(
        self,
        stream_state: MainLoopLlmStreamState,
        text: str,
    ) -> AsyncIterator[dict[str, Any]]:
        piece = polish_visible_text((text or "").replace("\ufffd", ""))
        if not piece:
            return
        self.delivery_emitted = True
        async for ev in _emit_delivery_message_delta(
            stream_state,
            piece,
            delivery_step_id=self.delivery_step_id,
            delivery_open=self.delivery_open,
        ):
            yield ev

    def _strip_orchestration_prefix(self, piece: str) -> str:
        channel, body, matched = self._classify_with_match(piece)
        if matched and channel == "orchestration":
            return body
        inline = extract_channel_body_from_text(piece, "orchestration")
        if inline:
            return inline
        return piece

    def _awaiting_delivery_prefix(self) -> bool:
        if not self.prefix_scan_active:
            return False
        return could_be_delivery_prefix(self.prefix_hold)

    def _should_buffer_pending(self, piece: str) -> bool:
        if self.prefix_scan_active:
            return True
        if self.prefix_hold:
            return could_be_delivery_prefix(self.prefix_hold)
        if not piece:
            return False
        normalized = piece.lstrip("\ufeff")
        if not normalized.startswith("["):
            return False
        return could_be_delivery_prefix(normalized)

    async def _route_pieces(
        self,
        stream_state: MainLoopLlmStreamState,
        pieces: list[str],
        *,
        tool_signal: bool,
    ) -> AsyncIterator[dict[str, Any]]:
        del tool_signal
        for piece in pieces:
            if not piece:
                continue

            if self.mode == "delivery" and self.route_locked_by_prefix:
                async for ev in self._emit_delivery(stream_state, piece):
                    yield ev
                continue

            channel, body = self._try_lock_piece(piece)
            if channel == "delivery" and body:
                async for ev in self._emit_delivery(stream_state, body):
                    yield ev
                continue

            inline_delivery = extract_channel_body_from_text(piece, "delivery")
            if inline_delivery:
                self.route_locked_by_prefix = True
                self.lock_mode("delivery")
                async for ev in self._emit_delivery(stream_state, inline_delivery):
                    yield ev
                continue

            reasoning_text = body if channel == "orchestration" and body else self._strip_orchestration_prefix(piece)
            async for ev in self._emit_reasoning(stream_state, reasoning_text):
                yield ev

    async def feed(
        self,
        stream_state: MainLoopLlmStreamState,
        text: str,
        *,
        tool_signal: bool,
    ) -> AsyncIterator[dict[str, Any]]:
        del tool_signal
        if not text:
            return

        pieces = self._ingest_through_prefix_scan(text)
        async for ev in self._route_pieces(
            stream_state, pieces, tool_signal=False
        ):
            yield ev

    async def finish(
        self,
        stream_state: MainLoopLlmStreamState,
        *,
        has_tool_calls: bool,
        full_visible: str,
    ) -> AsyncIterator[dict[str, Any]]:
        trailing = self._resolve_prefix_hold()
        if trailing is not None and trailing:
            async for ev in self._route_pieces(
                stream_state,
                [trailing],
                tool_signal=False,
            ):
                yield ev

        visible = (full_visible or "").replace("\ufffd", "").strip()

        if self.mode == "delivery" and self.route_locked_by_prefix:
            self.pending_parts.clear()
            if not self.delivery_emitted:
                _, stripped_visible = classify_visible_channel_prefix(visible)
                stripped_visible = polish_visible_text(stripped_visible)
                if stripped_visible:
                    async for ev in self._emit_delivery(stream_state, stripped_visible):
                        yield ev
            return

        self.pending_parts.clear()
        if has_tool_calls:
            return

        if not self.delivery_emitted:
            delivery_body = extract_delivery_body_from_text(visible)
            if delivery_body:
                async for ev in self._emit_delivery(stream_state, delivery_body):
                    yield ev


async def _emit_planning_narration_delta(
    state: MainLoopLlmStreamState,
    text: str,
) -> AsyncIterator[dict[str, Any]]:
    """Orchestration narration (distinct from output tool message.delta delivery)."""
    piece = (text or "").replace("\ufffd", "")
    if not piece:
        return
    for delta in emit_sse_text_chunks(piece):
        yield build_event(
            event_type="narration.delta",
            run_id=state.run_id,
            session_id=state.session_id,
            message_id=state.message_id,
            step_id=state.step_id,
            sequence=state.sequence,
            payload={"text": delta},
        )
        state.sequence += 1
        await asyncio.sleep(_REASONING_DELTA_INTERVAL_SEC)


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
            payload={"title": "编排推理"},
        )
        state.sequence += 1
    for delta in emit_sse_text_chunks(piece):
        yield build_event(
            event_type="reasoning.delta",
            run_id=state.run_id,
            session_id=state.session_id,
            message_id=state.message_id,
            step_id=state.reasoning_step_id,
            sequence=state.sequence,
            payload={"text": delta},
        )
        state.sequence += 1
        await asyncio.sleep(_REASONING_DELTA_INTERVAL_SEC)


async def _emit_delivery_message_delta(
    state: MainLoopLlmStreamState,
    text: str,
    *,
    delivery_step_id: str,
    delivery_open: list[bool],
) -> AsyncIterator[dict[str, Any]]:
    """Final user-visible reply when the turn has no tool_use (not orchestration narration)."""
    piece = (text or "").replace("\ufffd", "")
    if not piece:
        return
    if not delivery_open[0]:
        delivery_open[0] = True
        yield build_event(
            event_type="message.started",
            run_id=state.run_id,
            session_id=state.session_id,
            message_id=state.message_id,
            step_id=delivery_step_id,
            sequence=state.sequence,
            payload={"role": "assistant"},
        )
        state.sequence += 1
    for delta in emit_sse_text_chunks(piece):
        yield build_event(
            event_type="message.delta",
            run_id=state.run_id,
            session_id=state.session_id,
            message_id=state.message_id,
            step_id=delivery_step_id,
            sequence=state.sequence,
            payload={"text": delta},
        )
        state.sequence += 1
        await asyncio.sleep(_REASONING_DELTA_INTERVAL_SEC)


def _chunk_signals_tool_use(chunk: AIMessageChunk) -> bool:
    tcc = getattr(chunk, "tool_call_chunks", None) or []
    if tcc:
        return True
    tc = getattr(chunk, "tool_calls", None) or []
    return bool(tc)


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
    delivery_step_id = f"step_msg_{uuid4().hex[:8]}"
    delivery_open = [False]
    router = _VisibleTextRouter(
        delivery_step_id=delivery_step_id,
        delivery_open=delivery_open,
    )

    try:
        async for chunk in llm.astream(messages):
            if gathered is None:
                gathered = chunk
            else:
                gathered = gathered + chunk

            tool_signal = _chunk_signals_tool_use(chunk) or _gathered_has_tool_calls(
                gathered
            )

            raw = getattr(chunk, "content", chunk)
            for kind, text in splitter.feed(raw):
                if kind == "reasoning":
                    async for ev in _emit_reasoning_delta(stream_state, text):
                        yield ev
                elif kind == "text":
                    async for ev in router.feed(
                        stream_state, text, tool_signal=tool_signal
                    ):
                        yield ev

        if stream_state.reasoning_open:
            yield build_event(
                event_type="reasoning.completed",
                run_id=ctx.run_id,
                session_id=ctx.session_id,
                message_id=ctx.message_id,
                step_id=stream_state.reasoning_step_id,
                sequence=stream_state.sequence,
                payload={},
            )
            stream_state.sequence += 1

        has_tool_calls = _gathered_has_tool_calls(gathered)
        full_visible = ""
        if gathered is not None:
            full_visible = extract_llm_text(
                getattr(gathered, "content", gathered),
                include_thinking=False,
            )

        async for ev in router.finish(
            stream_state,
            has_tool_calls=has_tool_calls,
            full_visible=full_visible,
        ):
            yield ev

        if delivery_open[0] and not has_tool_calls:
            yield build_event(
                event_type="message.completed",
                run_id=ctx.run_id,
                session_id=ctx.session_id,
                message_id=ctx.message_id,
                step_id=delivery_step_id,
                sequence=stream_state.sequence,
                payload={"role": "assistant"},
            )
            stream_state.sequence += 1

        if gathered is None:
            yield AIMessage(content="")
            return

        log_llm_exchange(
            phase="main_loop",
            run_id=ctx.run_id,
            messages=messages,
            raw_response=gathered,
            extra={
                "planning_step_id": planning_step_id,
                "has_tool_calls": has_tool_calls,
                "visible_route_mode": router.mode,
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
        if stream_state.reasoning_open:
            yield build_event(
                event_type="reasoning.completed",
                run_id=ctx.run_id,
                session_id=ctx.session_id,
                message_id=ctx.message_id,
                step_id=stream_state.reasoning_step_id,
                sequence=stream_state.sequence,
                payload={},
            )
        raise
