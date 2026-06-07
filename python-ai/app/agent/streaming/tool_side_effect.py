"""Tool failure events and chapter write persistence side-effects."""

from __future__ import annotations

from typing import Any

from app.agent.harness.events import build_tool_completed_sse_payload
from app.agent.schemas import AgentRunContext
from app.agent.tools.tool import ToolCallResult
from app.runtime.events import build_event


def failure_event_sequence(
    *,
    tool: str,
    inp: dict[str, Any],
    result: ToolCallResult,
    run_id: str,
    session_id: str,
    message_id: str,
    step_id: str,
    sequence: int,
) -> tuple[list[dict[str, Any]], int]:
    """tool.completed (failed) then step.failed — same step_id for UI + query-loop recovery."""
    err_text = (result.content or "").strip() or "tool failed"
    seq = sequence
    events: list[dict[str, Any]] = []
    completed_payload = build_tool_completed_sse_payload(
        tool,
        content=err_text,
        failed=True,
        tool_input=inp,
        context_patch=result.context_patch,
    )
    events.append(
        build_event(
            event_type="tool.completed",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload=completed_payload,
        )
    )
    seq += 1
    events.append(
        build_event(
            event_type="step.failed",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload={"error": err_text, "tool": tool, "name": tool},
        )
    )
    seq += 1
    return events, seq


async def finalize_streamed_chapter_write(
    *,
    ctx: AgentRunContext,
    tool: str,
    inp: dict[str, Any],
    content: str,
    stream_input: dict[str, Any],
    file_path: str,
    run_id: str,
    session_id: str,
    message_id: str,
    step_id: str,
    sequence: int,
) -> tuple[ToolCallResult | None, list[dict[str, Any]], int]:
    """
    Persist streamed chapter body. Returns (result, progress/fail events, next_seq).
    result is None when failure events were built.
    """
    from app.agent.tools.chapter_stream import (
        attach_chapter_write_patch,
        persist_chapter_write_patch,
    )

    stream_fp = file_path or (
        f"/novel/{ctx.novel_id or 'unknown'}/chapters/"
        f"{stream_input.get('chapter_id') or '_new'}.md"
    )
    patch = attach_chapter_write_patch(
        {
            "chapter_write": {
                "title": stream_input.get("title"),
                "content": content,
                "chapter_id": stream_input.get("chapter_id"),
            }
        },
        file_path=stream_fp,
        content=content,
        ctx=ctx,
        title=str(stream_input.get("title") or ""),
        chapter_id=str(stream_input.get("chapter_id") or ""),
    )
    title_err = patch.get("chapter_write_error")
    if isinstance(title_err, str) and title_err.strip():
        fail_events, seq = failure_event_sequence(
            tool=tool,
            inp=inp,
            result=ToolCallResult(
                content=title_err.strip(), is_error=True, context_patch=patch
            ),
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=sequence,
        )
        return None, fail_events, seq

    cw_pre = patch.get("chapter_write") if isinstance(patch.get("chapter_write"), dict) else {}
    save_label = str(
        cw_pre.get("display_label") or cw_pre.get("title") or stream_input.get("title") or "章节"
    )
    events: list[dict[str, Any]] = [
        build_event(
            event_type="tool.progress",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=sequence,
            payload={"name": tool, "message": f"正在保存{save_label}到作品库…"},
        )
    ]
    seq = sequence + 1
    patch, perr = await persist_chapter_write_patch(ctx, patch)
    if perr:
        fail_events, seq = failure_event_sequence(
            tool=tool,
            inp=inp,
            result=ToolCallResult(content=perr, is_error=True, context_patch=patch),
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
        )
        return None, fail_events, seq

    cw = patch.get("chapter_write") if isinstance(patch.get("chapter_write"), dict) else {}
    label = str(cw.get("display_label") or cw.get("title") or "章节")
    return (
        ToolCallResult(
            content=f"Wrote {label} ({len(content)} chars).",
            context_patch=patch,
        ),
        events,
        seq,
    )
