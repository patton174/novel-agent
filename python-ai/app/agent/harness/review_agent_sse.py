"""SSE streaming for auto-spawned review sub-agent (forwards child loop to parent UI)."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

from app.agent.harness.review_agent import (
    _PATCH_CHANGED_IDS,
    _PATCH_REVIEW_AGENT,
    REVIEW_DESCRIPTION,
    _build_review_prompt,
)
from app.agent.harness.subagent import (
    _extract_subagent_delivery_text,
    _summarize_subagent_events,
    build_subagent_context,
)
from app.agent.harness.subagent_policy import is_subagent_run, subagent_depth
from app.agent.harness.subagent_sse import (
    _map_child_to_subagent_progress,
    _subagent_payload,
)
from app.agent.schemas import AgentRunContext, RunRequest
from app.config import settings
from app.runtime.events import build_event

logger = logging.getLogger(__name__)


def _review_parent_step_id() -> str:
    return f"step_review_{uuid4().hex[:8]}"


def _resolve_changed_ids(
    parent: AgentRunContext,
    changed_chapter_ids: list[str] | None,
) -> list[str]:
    ids = [str(c).strip() for c in (changed_chapter_ids or []) if str(c).strip()]
    if ids:
        return ids
    patch = parent.context_patch if isinstance(parent.context_patch, dict) else {}
    raw = patch.get("run_changed_chapter_ids")
    if isinstance(raw, list):
        return [str(c).strip() for c in raw if str(c).strip()]
    return []


def _review_context_patch(
    parent: AgentRunContext,
    *,
    child_run_id: str,
    changed_ids: list[str],
    ok: bool,
) -> dict[str, Any]:
    return {
        "last_review_agent": {
            "parent_run_id": parent.run_id,
            "child_run_id": child_run_id,
            "changed_chapter_ids": changed_ids,
            "ok": ok,
        },
        "run_needs_review": False,
    }


async def stream_review_subagent(
    parent: AgentRunContext,
    *,
    changed_chapter_ids: list[str] | None = None,
    sequence: int = 0,
) -> AsyncIterator[dict[str, Any]]:
    """Run read-only review sub-agent; yield subagent.* SSE for parent timeline."""
    run_id = parent.run_id
    session_id = parent.session_id
    message_id = parent.message_id
    step_id = _review_parent_step_id()
    seq = sequence
    description = REVIEW_DESCRIPTION

    if subagent_depth(parent) >= settings.agent_subagent_max_depth:
        err = "已在子 Agent 内，跳过嵌套审查 Agent。"
        yield build_event(
            event_type="subagent.failed",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload={
                "parent_step_id": step_id,
                "error": err,
                "subagent_kind": "review",
            },
        )
        return

    changed_ids = _resolve_changed_ids(parent, changed_chapter_ids)
    prompt = _build_review_prompt(changed_ids)
    child = build_subagent_context(
        parent,
        description=description,
        prompt=prompt,
        extra_patch={
            _PATCH_REVIEW_AGENT: True,
            _PATCH_CHANGED_IDS: changed_ids,
            "_max_turns": min(settings.agent_subagent_max_turns, 12),
        },
    )
    child_run_id = child.run_id
    max_turns = min(settings.agent_subagent_max_turns, 12)

    logger.info(
        "review agent stream start parent=%s child=%s changed=%s",
        parent.run_id,
        child_run_id,
        len(changed_ids),
    )

    yield build_event(
        event_type="subagent.started",
        run_id=run_id,
        session_id=session_id,
        message_id=message_id,
        step_id=step_id,
        sequence=seq,
        payload=_subagent_payload(
            parent_step_id=step_id,
            child_run_id=child_run_id,
            description=description,
            extra={
                "max_turns": max_turns,
                "prompt_preview": prompt[:280],
                "subagent_kind": "review",
            },
        ),
    )
    seq += 1

    await asyncio.sleep(0)

    yield build_event(
        event_type="tool.progress",
        run_id=run_id,
        session_id=session_id,
        message_id=message_id,
        step_id=step_id,
        sequence=seq,
        payload={
            "name": "Agent",
            "display_name": "审查 Agent",
            "message": f"审查 Agent 执行中：{description[:48]}",
        },
    )
    seq += 1

    from app.agent.loop import run_query_loop

    collected: list[dict[str, Any]] = []
    turn_counter = 0
    delivery_stream = ""
    async for child_ev in run_query_loop(RunRequest(context=child)):
        if not isinstance(child_ev, dict):
            continue
        collected.append(child_ev)
        if is_subagent_run(child):
            pass
        et = str(child_ev.get("type") or "")
        child_payload = (
            child_ev.get("payload")
            if isinstance(child_ev.get("payload"), dict)
            else {}
        )
        if et == "message.delta":
            piece = str(
                child_payload.get("text") or child_payload.get("content") or ""
            )
            if piece:
                delivery_stream += piece
        if et == "planning.next_step":
            turn_counter += 1
            child_payload = {**child_payload, "turn": turn_counter}
            child_ev = {**child_ev, "payload": child_payload}
        progress = _map_child_to_subagent_progress(
            child_ev,
            parent_step_id=step_id,
            child_run_id=child_run_id,
            description=description,
            turn=turn_counter if turn_counter > 0 else None,
        )
        if progress:
            progress["subagent_kind"] = "review"
            yield build_event(
                event_type="subagent.progress",
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=step_id,
                sequence=seq,
                payload=progress,
            )
            seq += 1
        if et in ("run.failed", "planning.failed"):
            break

    summary, is_error = _summarize_subagent_events(description, collected)
    ui_delivery = _extract_subagent_delivery_text(
        collected,
        streamed_delivery=delivery_stream,
    )
    summary_preview = ui_delivery or summary
    review_patch = _review_context_patch(
        parent,
        child_run_id=child_run_id,
        changed_ids=changed_ids,
        ok=not is_error,
    )

    if is_error:
        yield build_event(
            event_type="subagent.failed",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload={
                "parent_step_id": step_id,
                "child_run_id": child_run_id,
                "error": summary[:800],
                "subagent_kind": "review",
                "context_patch": review_patch,
            },
        )
        seq += 1
        return

    yield build_event(
        event_type="subagent.completed",
        run_id=run_id,
        session_id=session_id,
        message_id=message_id,
        step_id=step_id,
        sequence=seq,
        payload=_subagent_payload(
            parent_step_id=step_id,
            child_run_id=child_run_id,
            description=description,
            extra={
                "turns": turn_counter,
                "summary_preview": summary_preview[:50_000],
                "subagent_kind": "review",
                "context_patch": review_patch,
            },
        ),
    )
