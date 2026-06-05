"""Serialize / restore worker loop state for PG checkpoint."""

from __future__ import annotations

import json
from typing import Any

from app.agent_step.query_loop_support import RunLoopState
from app.agent_step.schemas import AgentRunContext
from app.agent_step.transcript import AgentTranscript, TranscriptEntry


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


def serialize_worker_state(state: RunLoopState) -> str:
    payload = {
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
    return json.dumps(payload, ensure_ascii=False)


def restore_worker_state(blob: str | None, fallback_ctx: AgentRunContext) -> RunLoopState:
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
    )
