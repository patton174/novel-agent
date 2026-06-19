"""Serialize / restore query-loop state for durable PG checkpoint."""

from __future__ import annotations

import json
from typing import Any

from langchain_core.messages import BaseMessage, ToolMessage, messages_from_dict, messages_to_dict

from app.agent.harness.loop_support import RunLoopState
from app.agent.harness.transcript import AgentTranscript, TranscriptEntry
from app.agent.schemas import AgentRunContext

_CHECKPOINT_MESSAGE_LIMIT = 20


def _entry_to_dict(entry: TranscriptEntry) -> dict[str, Any]:
    return {
        "kind": entry.kind,
        "summary": entry.summary,
        "tool": entry.tool,
        "detail": entry.detail,
        "meta": entry.meta,
    }


def _entry_from_dict(raw: dict[str, Any]) -> TranscriptEntry:
    return TranscriptEntry(
        kind=raw.get("kind", "tool"),
        summary=str(raw.get("summary") or ""),
        tool=raw.get("tool"),
        detail=raw.get("detail"),
        meta=raw.get("meta") if isinstance(raw.get("meta"), dict) else {},
    )


def trim_messages_for_checkpoint(
    messages: list[BaseMessage],
    *,
    max_messages: int = _CHECKPOINT_MESSAGE_LIMIT,
) -> list[BaseMessage]:
    """Keep system + primary human + tail, preserving tool_call/ToolMessage pairs."""
    if len(messages) <= max_messages:
        return list(messages)
    head = messages[:2]
    body = messages[2:]
    slice_start = max(0, len(body) - max(0, max_messages - len(head)))
    while slice_start > 0 and isinstance(body[slice_start], ToolMessage):
        slice_start -= 1
    return head + body[slice_start:]


def serialize_run_checkpoint(
    state: RunLoopState,
    *,
    messages: list[BaseMessage] | None = None,
) -> str:
    payload: dict[str, Any] = {
        "turn": state.turn,
        "sequence": state.sequence,
        "think_content": state.think_content,
        "terminal": state.terminal,
        "last_run_error": state.last_run_error,
        "after_interaction": state.after_interaction,
        "assistant_message_emitted": state.assistant_message_emitted,
        "context": state.ctx.model_dump(mode="json"),
        "transcript_entries": [_entry_to_dict(e) for e in state.transcript.entries],
    }
    if messages:
        trimmed = trim_messages_for_checkpoint(messages)
        payload["messages_json"] = messages_to_dict(trimmed)
    elif state.messages:
        trimmed = trim_messages_for_checkpoint(state.messages)
        payload["messages_json"] = messages_to_dict(trimmed)
    return json.dumps(payload, ensure_ascii=False)


def restore_run_checkpoint(blob: str | None, fallback_ctx: AgentRunContext) -> RunLoopState:
    if not blob or not blob.strip() or blob.strip() in ("{}", "null"):
        return RunLoopState(
            ctx=fallback_ctx,
            transcript=AgentTranscript(),
            think_content="",
            sequence=0,
        )
    raw = json.loads(blob)
    ctx = AgentRunContext.model_validate(raw.get("context") or fallback_ctx.model_dump())
    transcript = AgentTranscript()
    for item in raw.get("transcript_entries") or []:
        if isinstance(item, dict):
            transcript.entries.append(_entry_from_dict(item))

    restored_messages: list[BaseMessage] | None = None
    raw_msgs = raw.get("messages_json")
    if isinstance(raw_msgs, list) and raw_msgs:
        restored_messages = messages_from_dict(raw_msgs)

    return RunLoopState(
        ctx=ctx,
        transcript=transcript,
        think_content=str(raw.get("think_content") or ""),
        sequence=int(raw.get("sequence") or 0),
        turn=int(raw.get("turn") or 0),
        terminal=bool(raw.get("terminal")),
        last_run_error=raw.get("last_run_error"),
        after_interaction=bool(raw.get("after_interaction")),
        assistant_message_emitted=bool(raw.get("assistant_message_emitted")),
        messages=restored_messages,
    )
