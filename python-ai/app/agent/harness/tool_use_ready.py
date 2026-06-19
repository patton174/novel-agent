"""Emit validated tool.use.ready (incremental LLM stream → executor)."""

from __future__ import annotations

from typing import Any

from app.agent.harness.tool_call_chunk_accumulator import ReadyToolCall
from app.agent.schemas import AgentRunContext
from app.agent.tools.prepare_tool_input import prepare_tool_input
from app.runtime.events import build_event


def build_validated_tool_use_events(
    *,
    ready: ReadyToolCall,
    ctx: AgentRunContext,
    run_id: str,
    session_id: str,
    message_id: str,
    step_id: str,
    sequence: int,
) -> tuple[list[dict[str, Any]], int]:
    """Validate tool args; emit tool.use.ready or tool.use.invalid. Returns (events, next_seq)."""
    prepared, err = prepare_tool_input(ready.tool, dict(ready.input or {}), ctx)
    seq = sequence
    if err or prepared is None:
        ev = build_event(
            event_type="tool.use.invalid",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload={
                "tool_call_id": ready.tool_call_id,
                "tool": ready.tool,
                "input": ready.input,
                "stream_index": ready.stream_index,
                "error": err or "invalid input",
            },
        )
        return [ev], seq + 1

    ev = build_event(
        event_type="tool.use.ready",
        run_id=run_id,
        session_id=session_id,
        message_id=message_id,
        step_id=step_id,
        sequence=seq,
        payload={
            "tool_call_id": ready.tool_call_id,
            "tool": prepared.tool,
            "input": prepared.canonical,
            "stream_index": ready.stream_index,
        },
    )
    return [ev], seq + 1
