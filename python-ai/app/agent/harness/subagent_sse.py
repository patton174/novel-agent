"""SSE streaming for Agent-tool subagent runs (forwards child loop to parent UI)."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

from app.agent.harness.events import build_tool_completed_sse_payload
from app.agent.harness.subagent import build_subagent_context, subagent_depth
from app.agent.harness.subagent_policy import is_subagent_run
from app.agent.harness.tool_result_routing import build_model_step_payload
from app.agent.schemas import AgentRunContext, RunRequest
from app.agent.tools.schemas import AgentInput
from app.agent.tools.tool import ToolCallResult
from app.config import settings
from app.runtime.events import build_event

logger = logging.getLogger(__name__)


def _parent_step_id(step_id: str) -> str:
    return (step_id or "").strip() or f"step_{uuid4().hex[:8]}"


def _subagent_tool_meta(payload: dict[str, Any], tool: str) -> dict[str, Any]:
    """Mirror main-agent tool.completed fields for subagent UI (chapter title, path)."""
    from app.agent.harness.events import _tool_input_for_sse
    from app.agent.harness.tool_ui import vfs_path_from_tool_input

    inp = payload.get("tool_input")
    if not isinstance(inp, dict):
        inp = {}
    fp = str(payload.get("file_path") or vfs_path_from_tool_input(inp) or "").strip()
    if fp and "file_path" not in inp:
        inp = {**inp, "file_path": fp}
    labels = payload.get("result_labels")
    result_labels = (
        [str(x) for x in labels if str(x).strip()][:6]
        if isinstance(labels, list)
        else []
    )
    slim = _tool_input_for_sse(tool, inp) if inp else {}
    meta: dict[str, Any] = {}
    if fp:
        meta["file_path"] = fp
    display = str(payload.get("display_name") or payload.get("title") or "").strip()
    if display:
        meta["display_name"] = display
    if result_labels:
        meta["result_labels"] = result_labels
    if slim:
        meta["tool_input"] = slim
    return meta


def _subagent_payload(
    *,
    parent_step_id: str,
    child_run_id: str,
    description: str,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    base: dict[str, Any] = {
        "parent_step_id": parent_step_id,
        "child_run_id": child_run_id,
        "description": description[:200],
    }
    if extra:
        base.update(extra)
    return base


def _map_child_to_subagent_progress(
    child: dict[str, Any],
    *,
    parent_step_id: str,
    child_run_id: str,
    description: str,
    turn: int | None = None,
) -> dict[str, Any] | None:
    et = str(child.get("type") or "")
    payload = child.get("payload") if isinstance(child.get("payload"), dict) else {}

    if et == "planning.next_step":
        turn = payload.get("turn")
        return _subagent_payload(
            parent_step_id=parent_step_id,
            child_run_id=child_run_id,
            description=description,
            extra={
                "phase": "_turn",
                "turn": int(turn) if turn is not None else None,
            },
        )

    if et == "reasoning.started":
        return _subagent_payload(
            parent_step_id=parent_step_id,
            child_run_id=child_run_id,
            description=description,
            extra={"phase": "reasoning_start"},
        )

    if et == "reasoning.completed":
        return _subagent_payload(
            parent_step_id=parent_step_id,
            child_run_id=child_run_id,
            description=description,
            extra={"phase": "reasoning_end"},
        )

    if et == "tool.started":
        name = str(payload.get("name") or payload.get("display_name") or "tool")
        return _subagent_payload(
            parent_step_id=parent_step_id,
            child_run_id=child_run_id,
            description=description,
            extra={
                "phase": "tool_started",
                "tool": name,
                "title": str(payload.get("display_name") or name),
                "child_step_id": str(child.get("step_id") or ""),
                **_subagent_tool_meta(payload, name),
            },
        )

    if et == "tool.completed":
        tool = str(payload.get("name") or payload.get("display_name") or "").strip()
        if not tool or tool in ("think", "Agent"):
            return None
        failed = str(payload.get("status") or "").lower() == "error"
        excerpt = str(
            payload.get("display_excerpt")
            or payload.get("output_summary")
            or ""
        ).strip()[:500]
        return _subagent_payload(
            parent_step_id=parent_step_id,
            child_run_id=child_run_id,
            description=description,
            extra={
                "phase": "tool_done",
                "tool": tool,
                "title": str(payload.get("display_name") or tool),
                "excerpt": excerpt,
                "status": "failed" if failed else "ok",
                "child_step_id": str(child.get("step_id") or ""),
                **_subagent_tool_meta(payload, tool),
            },
        )

    if et == "step.completed":
        # Model-only payload; browser metadata is on tool.completed (see tool_result_routing).
        return None

    if et in ("step.failed", "planning.failed"):
        err = str(payload.get("error") or "失败").strip()[:400]
        return _subagent_payload(
            parent_step_id=parent_step_id,
            child_run_id=child_run_id,
            description=description,
            extra={"phase": "error", "title": err, "status": "failed"},
        )

    if et == "reasoning.delta":
        text = str(payload.get("text") or "")
        if not text.strip():
            return None
        return _subagent_payload(
            parent_step_id=parent_step_id,
            child_run_id=child_run_id,
            description=description,
            extra={
                "phase": "reasoning",
                "snippet": text,
                **({"turn": int(turn)} if turn is not None else {}),
            },
        )

    if et == "message.delta":
        text = str(payload.get("text") or payload.get("content") or "")
        if not text:
            return None
        return _subagent_payload(
            parent_step_id=parent_step_id,
            child_run_id=child_run_id,
            description=description,
            extra={
                "phase": "output_delta",
                "snippet": text,
            },
        )

    return None


async def stream_subagent_tool(
    ctx: AgentRunContext,
    tool_input: dict[str, Any],
    *,
    parent_step_id: str,
    sequence: int,
) -> AsyncIterator[dict[str, Any]]:
    """Run subagent query_loop; yield subagent.* SSE then tool/step completed."""
    from app.agent.harness.cc_visibility import tool_display_name

    run_id = ctx.run_id
    session_id = ctx.session_id
    message_id = ctx.message_id
    step_id = _parent_step_id(parent_step_id)
    seq = sequence
    inp = dict(tool_input or {})

    try:
        parsed = AgentInput.model_validate(inp)
    except Exception as exc:
        result = ToolCallResult(
            content=f"<tool_use_error>{exc}</tool_use_error>",
            is_error=True,
        )
        yield build_event(
            event_type="subagent.failed",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload={
                "parent_step_id": step_id,
                "error": str(exc),
            },
        )
        seq += 1
        completed = build_tool_completed_sse_payload(
            "Agent", content=result.content, failed=True, tool_input=inp
        )
        yield build_event(
            event_type="tool.completed",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload=completed,
        )
        seq += 1
        yield build_event(
            event_type="step.completed",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload=build_model_step_payload("Agent", result),
        )
        return

    description = (parsed.description or "子任务").strip()
    prompt = (parsed.prompt or "").strip()

    if subagent_depth(ctx) >= settings.agent_subagent_max_depth:
        result = ToolCallResult(
            content="<tool_use_error>禁止嵌套子 Agent。</tool_use_error>",
            is_error=True,
        )
        yield build_event(
            event_type="subagent.failed",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload={"parent_step_id": step_id, "error": result.content},
        )
        seq += 1
        completed = build_tool_completed_sse_payload(
            "Agent", content=result.content, failed=True, tool_input=inp
        )
        yield build_event(
            event_type="tool.completed",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload=completed,
        )
        seq += 1
        yield build_event(
            event_type="step.completed",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload=build_model_step_payload("Agent", result),
        )
        return

    if not prompt:
        result = ToolCallResult(
            content="<tool_use_error>Agent 需要非空 prompt。</tool_use_error>",
            is_error=True,
        )
        yield build_event(
            event_type="subagent.failed",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload={"parent_step_id": step_id, "error": "empty prompt"},
        )
        seq += 1
        completed = build_tool_completed_sse_payload(
            "Agent", content=result.content, failed=True, tool_input=inp
        )
        yield build_event(
            event_type="tool.completed",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload=completed,
        )
        seq += 1
        yield build_event(
            event_type="step.completed",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload=build_model_step_payload("Agent", result),
        )
        return

    child = build_subagent_context(ctx, description=description, prompt=prompt)
    child_run_id = child.run_id
    max_turns = settings.agent_subagent_max_turns

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
            "display_name": tool_display_name("Agent", inp),
            "message": f"子 Agent 执行中：{description[:48]}",
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

    from app.agent.harness.subagent import (
        _extract_subagent_delivery_text,
        _summarize_subagent_events,
    )

    summary, is_error = _summarize_subagent_events(description, collected)
    ui_delivery = _extract_subagent_delivery_text(
        collected,
        streamed_delivery=delivery_stream,
    )
    summary_preview = ui_delivery or summary

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
            },
        )
        seq += 1
    else:
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
                },
            ),
        )
        seq += 1

    result = ToolCallResult(
        content=summary,
        is_error=is_error,
        context_patch={
            "last_subagent": {
                "parent_run_id": ctx.run_id,
                "child_run_id": child_run_id,
                "description": description[:200],
                "ok": not is_error,
            }
        },
    )

    completed = build_tool_completed_sse_payload(
        "Agent",
        content=result.content or "",
        failed=result.is_error,
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
        payload=completed,
    )
    seq += 1
    yield build_event(
        event_type="step.completed",
        run_id=run_id,
        session_id=session_id,
        message_id=message_id,
        step_id=step_id,
        sequence=seq,
        payload=build_model_step_payload("Agent", result),
    )
