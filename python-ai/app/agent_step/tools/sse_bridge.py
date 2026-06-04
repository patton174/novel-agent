"""Execute CC tools and yield SSE events (replaces legacy executor)."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

from app.agent_step.cc_visibility import (
    normalize_tool_name,
    should_emit_tool_started,
    tool_display_name,
)
from app.agent_step.tool_display import (
    chapter_write_progress_message,
    format_tool_display_excerpt,
    read_progress_message,
)
from app.agent_step.events import build_tool_completed_sse_payload
from app.agent_step.schemas import AgentRunContext, StepRequest
from app.agent_step.tools.registry import find_tool_by_name
from app.agent_step.tools.run_tool_use import run_tool_use
from app.agent_step.tools.tool import ToolCallResult
from app.runtime.events import build_event
from app.runtime.streaming import emit_sse_text_chunks

logger = logging.getLogger(__name__)

_MESSAGE_DELTA_INTERVAL = 0.022
_CHAPTER_STREAM_INTERVAL = 0.004
_CHAPTER_CHUNK_MIN = 48
_CHAPTER_CHUNK_MAX = 96
_CHAPTER_STREAM_TOOLS = frozenset({"Write", "Edit"})
_READ_PROGRESS_TOOLS = frozenset({"Read", "Glob", "Grep", "memory_read", "context_search"})
_EXCERPT_STREAM_INTERVAL = 0.008


def _is_chapter_markdown_path(file_path: str) -> bool:
    fp = (file_path or "").strip()
    return "/chapters/" in fp and fp.endswith(".md")


def _chapter_stream_input(
    inp: dict[str, Any], ctx: AgentRunContext, file_path: str
) -> dict[str, Any]:
    stream_input = dict(inp)
    title = str(stream_input.get("title") or "").strip()
    if not title and "/chapters/" in file_path:
        from app.agent_step.vfs.chapter_meta import catalog_chapter_title, is_valid_chapter_title

        chapter_id = file_path.split("/chapters/")[-1].replace(".md", "").strip()
        if chapter_id and chapter_id != "_new":
            catalog = catalog_chapter_title(ctx, chapter_id)
            if is_valid_chapter_title(catalog):
                title = catalog
    if title:
        stream_input["title"] = title
    stream_input.setdefault("task", (ctx.user_message or "")[:500])
    if "/chapters/" in file_path:
        chapter_id = file_path.split("/chapters/")[-1].replace(".md", "").strip()
        if chapter_id and chapter_id != "_new":
            stream_input["chapter_id"] = chapter_id
    return stream_input


async def _yield_chapter_stream_deltas(
    text: str,
    *,
    run_id: str,
    session_id: str,
    message_id: str,
    step_id: str,
    seq: int,
) -> AsyncIterator[tuple[dict[str, Any], int]]:
    """Emit chapter.stream.delta events in small chunks for editor + timeline."""
    if not (text or "").strip():
        return
    current_seq = seq
    for delta in emit_sse_text_chunks(
        text,
        min_size=_CHAPTER_CHUNK_MIN,
        max_size=_CHAPTER_CHUNK_MAX,
    ):
        yield (
            build_event(
                event_type="chapter.stream.delta",
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
        await asyncio.sleep(_CHAPTER_STREAM_INTERVAL)


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


async def _enrich_context(ctx: AgentRunContext, *, refresh_story_memory: bool = False) -> AgentRunContext:
    from app.agent_step.context_enrich import enrich_context_for_run

    return await enrich_context_for_run(
        ctx,
        refresh_story_memory=refresh_story_memory,
        refresh_chapters=True,
    )


def _failure_event_sequence(
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


def tool_result_to_step_payload(
    tool: str, result: ToolCallResult
) -> dict[str, Any]:
    from app.agent_step.tool_result_routing import build_model_step_payload

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
    tool_norm = normalize_tool_name(tool)
    preset_body = str(inp.get("content") or "").strip() or str(
        inp.get("new_string") or ""
    ).strip()
    should_stream_chapter = tool_norm in _CHAPTER_STREAM_TOOLS and _is_chapter_markdown_path(
        fp
    )

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

    if should_stream_chapter:
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
        stream_input_preview = _chapter_stream_input(inp, ctx, fp)
        yield build_event(
            event_type="chapter.stream.started",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload={
                "tool": tool,
                "title": str(stream_input_preview.get("title") or "章节"),
                "chapter_id": stream_input_preview.get("chapter_id"),
            },
        )
        seq += 1

    ctx = await _enrich_context(ctx)

    if should_stream_chapter:
        from app.agent_step.chapter_body import stream_chapter_body

        stream_input = _chapter_stream_input(inp, ctx, fp)
        body_parts: list[str] = []
        try:
            if preset_body:
                body_parts.append(preset_body)
                async for ev, next_seq in _yield_chapter_stream_deltas(
                    preset_body,
                    run_id=run_id,
                    session_id=session_id,
                    message_id=message_id,
                    step_id=step_id,
                    seq=seq,
                ):
                    yield ev
                    seq = next_seq
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
                        "message": (
                            f"{chapter_write_progress_message(tool, inp, ctx).rstrip('…')}，"
                            "正在生成正文…"
                        ),
                    },
                )
                seq += 1
                async for part in stream_chapter_body(ctx, stream_input):
                    piece = getattr(part, "text", "") or ""
                    if not piece:
                        continue
                    body_parts.append(piece)
                    async for ev, next_seq in _yield_chapter_stream_deltas(
                        piece,
                        run_id=run_id,
                        session_id=session_id,
                        message_id=message_id,
                        step_id=step_id,
                        seq=seq,
                    ):
                        yield ev
                        seq = next_seq
        except Exception as exc:
            yield build_event(
                event_type="step.failed",
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=step_id,
                sequence=seq,
                payload={"error": str(exc), "tool": tool},
            )
            return

        yield build_event(
            event_type="chapter.stream.completed",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload={"tool": tool},
        )
        seq += 1
        content = "".join(body_parts)
        from app.agent_step.tools.cc import _attach_chapter_write_patch, _persist_chapter_write_patch

        if tool_norm == "Edit":
            edit_inp = dict(inp)
            if content and not str(edit_inp.get("new_string") or "").strip():
                edit_inp["new_string"] = content
            result = await run_tool_use(tool, edit_inp, ctx, tool_use_id=step_id)
            if result.is_error:
                fail_events, seq = _failure_event_sequence(
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
        else:
            stream_fp = fp or (
                f"/novel/{ctx.novel_id or 'unknown'}/chapters/"
                f"{stream_input.get('chapter_id') or '_new'}.md"
            )
            patch = _attach_chapter_write_patch(
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
            )
            title_err = patch.get("chapter_write_error")
            if isinstance(title_err, str) and title_err.strip():
                fail_events, seq = _failure_event_sequence(
                    tool=tool,
                    inp=inp,
                    result=ToolCallResult(
                        content=title_err.strip(), is_error=True, context_patch=patch
                    ),
                    run_id=run_id,
                    session_id=session_id,
                    message_id=message_id,
                    step_id=step_id,
                    sequence=seq,
                )
                for ev in fail_events:
                    yield ev
                return
            cw_pre = (
                patch.get("chapter_write")
                if isinstance(patch.get("chapter_write"), dict)
                else {}
            )
            save_label = str(
                cw_pre.get("display_label")
                or cw_pre.get("title")
                or stream_input.get("title")
                or "章节"
            )
            yield build_event(
                event_type="tool.progress",
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=step_id,
                sequence=seq,
                payload={
                    "name": tool,
                    "message": f"正在保存{save_label}到作品库…",
                },
            )
            seq += 1
            patch, perr = await _persist_chapter_write_patch(ctx, patch)
            if perr:
                fail_events, seq = _failure_event_sequence(
                    tool=tool,
                    inp=inp,
                    result=ToolCallResult(content=perr, is_error=True, context_patch=patch),
                    run_id=run_id,
                    session_id=session_id,
                    message_id=message_id,
                    step_id=step_id,
                    sequence=seq,
                )
                for ev in fail_events:
                    yield ev
                return
            cw = (
                patch.get("chapter_write")
                if isinstance(patch.get("chapter_write"), dict)
                else {}
            )
            label = str(cw.get("display_label") or cw.get("title") or "章节")
            result = ToolCallResult(
                content=f"Wrote {label} ({len(content)} chars).",
                context_patch=patch,
            )
    else:
        if normalize_tool_name(tool) == "Agent":
            from app.agent_step.subagent_sse import stream_subagent_tool

            async for ev in stream_subagent_tool(
                ctx,
                inp,
                parent_step_id=step_id,
                sequence=seq,
            ):
                yield ev
            return

        fp = str(inp.get("file_path") or "")
        if tool in _CHAPTER_STREAM_TOOLS and "/chapters/" in fp:
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
        elif tool in _READ_PROGRESS_TOOLS or normalize_tool_name(tool) in (
            "Read",
            "Glob",
            "Grep",
        ):
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
        result = await run_tool_use(tool, inp, ctx, tool_use_id=step_id)
        if not result.is_error and (
            tool in _READ_PROGRESS_TOOLS
            or normalize_tool_name(tool) in ("Read", "Glob", "Grep")
        ):
            excerpt = format_tool_display_excerpt(
                tool, result.content or "", fp, tool_input=inp
            )
            if excerpt and len(excerpt) > 24:
                acc = ""
                for piece in emit_sse_text_chunks(
                    excerpt, min_size=6, max_size=18
                ):
                    acc += piece
                    yield build_event(
                        event_type="tool.progress",
                        run_id=run_id,
                        session_id=session_id,
                        message_id=message_id,
                        step_id=step_id,
                        sequence=seq,
                        payload={
                            "name": tool,
                            "display_excerpt": acc,
                        },
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
        fail_events, seq = _failure_event_sequence(
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
                payload={"role": "assistant"},
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
                payload={"role": "assistant"},
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
