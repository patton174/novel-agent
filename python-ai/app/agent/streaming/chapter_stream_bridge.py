"""Chapter body streaming — deltas, input shaping, stream pipeline."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

from app.agent.harness.tool_display import chapter_write_progress_message
from app.agent.schemas import AgentRunContext
from app.agent.streaming.context_enrich_bridge import enrich_context_for_tool_step
from app.agent.streaming.tool_side_effect import failure_event_sequence
from app.agent.tools.chapter_stream_persist import StreamingChapterAppender
from app.agent.tools.run_tool_use import run_tool_use
from app.agent.tools.tool import ToolCallResult
from app.runtime.events import build_event
from app.runtime.streaming import emit_sse_text_chunks

CHAPTER_STREAM_INTERVAL = 0
CHAPTER_CHUNK_MIN = 16
CHAPTER_CHUNK_MAX = 32
CHAPTER_STREAM_TOOLS = frozenset({"WriteChapter", "EditChapter"})


def is_chapter_markdown_path(file_path: str) -> bool:
    fp = (file_path or "").strip()
    return "/chapters/" in fp and fp.endswith(".md")


def chapter_stream_input_api(inp: dict[str, Any], ctx: AgentRunContext) -> dict[str, Any]:
    """Build stream input for WriteChapter / EditChapter API tools."""
    stream_input = dict(inp)
    stream_input.pop("content", None)
    title = str(stream_input.get("title") or "").strip()
    chapter_id = str(stream_input.get("chapter_id") or "").strip()
    if not title and chapter_id:
        from app.agent.backend.chapter_meta import catalog_chapter_title, is_valid_chapter_title

        catalog = catalog_chapter_title(ctx, chapter_id)
        if is_valid_chapter_title(catalog):
            title = catalog
    if title:
        stream_input["title"] = title
    stream_input.setdefault("task", (ctx.user_message or "")[:500])
    if chapter_id:
        stream_input["chapter_id"] = chapter_id
    index = inp.get("index")
    if index is not None:
        stream_input["index"] = index
        stream_input["target_position"] = index
    for key in ("target_position",):
        if key in inp and inp[key] is not None and key not in stream_input:
            stream_input[key] = inp[key]
    return stream_input


def chapter_stream_input(
    inp: dict[str, Any], ctx: AgentRunContext, file_path: str
) -> dict[str, Any]:
    stream_input = dict(inp)
    title = str(stream_input.get("title") or "").strip()
    if not title and "/chapters/" in file_path:
        from app.agent.backend.chapter_meta import catalog_chapter_title, is_valid_chapter_title

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


def should_stream_chapter_write(tool: str, inp: dict[str, Any]) -> bool:
    tool_norm = (tool or "").strip()
    if tool_norm == "WriteChapter":
        return True
    if str(inp.get("new_content") or "").strip():
        return False
    if inp.get("line_start") is not None:
        return False
    if tool_norm == "EditChapter":
        return bool(inp.get("rewrite")) and bool(str(inp.get("chapter_id") or "").strip())
    return False


async def yield_chapter_stream_deltas(
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
        min_size=CHAPTER_CHUNK_MIN,
        max_size=CHAPTER_CHUNK_MAX,
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
        await asyncio.sleep(CHAPTER_STREAM_INTERVAL)


@dataclass
class ChapterStreamResult:
    result: ToolCallResult | None = None
    failed: bool = False
    fail_events: list[dict[str, Any]] = field(default_factory=list)


async def run_chapter_stream_pipeline(
    *,
    ctx: AgentRunContext,
    tool: str,
    inp: dict[str, Any],
    run_id: str,
    session_id: str,
    message_id: str,
    step_id: str,
    sequence: int,
    outcome: ChapterStreamResult,
) -> AsyncIterator[dict[str, Any]]:
    """Stream chapter body (LLM or preset), persist; sets outcome.result on success."""
    seq = sequence
    tool_norm = (tool or "").strip()
    fp = str(inp.get("file_path") or "")
    preset_body = ""
    if tool_norm == "EditChapter":
        preset_body = str(inp.get("new_content") or "").strip()

    yield build_event(
        event_type="tool.progress",
        run_id=run_id,
        session_id=session_id,
        message_id=message_id,
        step_id=step_id,
        sequence=seq,
        payload={"name": tool, "message": chapter_write_progress_message(tool, inp, ctx)},
    )
    seq += 1

    ctx = await enrich_context_for_tool_step(ctx, refresh_chapters=True)
    if tool_norm == "EditChapter":
        from app.agent.tools.chapter_catalog import enrich_stream_chapter_input

        inp, resolve_err = await enrich_stream_chapter_input(ctx, inp)
        if resolve_err:
            fail_events, _ = failure_event_sequence(
                tool=tool,
                inp=inp,
                result=ToolCallResult(
                    content=f"<tool_use_error>{resolve_err}</tool_use_error>",
                    is_error=True,
                ),
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=step_id,
                sequence=seq,
            )
            outcome.failed = True
            outcome.fail_events = fail_events
            return
    stream_input = chapter_stream_input_api(inp, ctx)
    use_stream_persist = tool_norm == "WriteChapter"
    appender: StreamingChapterAppender | None = None
    if use_stream_persist:
        appender = StreamingChapterAppender(
            ctx,
            title=str(stream_input.get("title") or "章节"),
            chapter_id=str(stream_input.get("chapter_id") or ""),
            stream_input=stream_input,
        )

    yield build_event(
        event_type="chapter.stream.started",
        run_id=run_id,
        session_id=session_id,
        message_id=message_id,
        step_id=step_id,
        sequence=seq,
        payload={
            "tool": tool,
            "title": str(stream_input.get("title") or "章节"),
            "chapter_id": stream_input.get("chapter_id") or "",
        },
    )
    seq += 1

    body_parts: list[str] = []
    try:
        if preset_body:
            body_parts.append(preset_body)
            if appender is not None:
                await appender.append_delta(preset_body)
            async for ev, next_seq in yield_chapter_stream_deltas(
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
            from app.agent.harness.chapter_body import stream_chapter_body

            async for part in stream_chapter_body(ctx, stream_input):
                piece = getattr(part, "text", "") or ""
                if not piece:
                    continue
                body_parts.append(piece)
                if appender is not None:
                    await appender.append_delta(piece)
                async for ev, next_seq in yield_chapter_stream_deltas(
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

    if tool_norm == "EditChapter":
        edit_inp = dict(inp)
        if content:
            edit_inp["new_content"] = content
            edit_inp.pop("rewrite", None)
            edit_inp.pop("line_start", None)
            edit_inp.pop("line_end", None)
            edit_inp.pop("line_content", None)
        result = await run_tool_use(tool, edit_inp, ctx, tool_use_id=step_id)
        if result.is_error:
            fail_events, _ = failure_event_sequence(
                tool=tool,
                inp=inp,
                result=result,
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=step_id,
                sequence=seq,
            )
            outcome.failed = True
            outcome.fail_events = fail_events
            return
        outcome.result = result
        return

    if appender is None:
        outcome.failed = True
        outcome.fail_events = []
        return

    patch, perr = await appender.finalize()
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
        outcome.failed = True
        outcome.fail_events = fail_events
        return

    cw = patch.get("chapter_write") if isinstance(patch.get("chapter_write"), dict) else {}
    label = str(cw.get("display_label") or cw.get("title") or "章节")
    events: list[dict[str, Any]] = [
        build_event(
            event_type="tool.progress",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=seq,
            payload={"name": tool, "message": f"已流式保存{label}到作品库"},
        )
    ]
    outcome.result = ToolCallResult(
        content=f"Wrote {label} ({len(content)} chars).",
        context_patch=patch,
    )
    for ev in events:
        yield ev
