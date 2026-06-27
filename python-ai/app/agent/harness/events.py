"""Map StepResult.display to agent-event payloads."""

from __future__ import annotations

import re
from typing import Any
from uuid import uuid4

from app.agent.harness.cc_visibility import (
    is_ask_user_tool,
    is_hidden_ui_tool,
    normalize_tool_name,
)
from app.agent.harness.cc_visibility import (
    tool_display_name as cc_tool_display_name,
)
from app.agent.schemas import AgentRunContext, DisplayPayload, StepResult
from app.runtime.events import build_event
from app.runtime.streaming import emit_sse_text_chunks


def tool_display_name(tool: str, tool_input: dict[str, Any] | None = None) -> str:
    return cc_tool_display_name(tool, tool_input)


def extract_memory_read_labels(content: str) -> list[str]:
    """Titles from Read/Grep on memory paths (mirrors frontend parseMemoryReadTitles)."""
    text = (content or "").strip()
    if not text:
        return []
    seen: set[str] = set()
    titles: list[str] = []

    def push(raw: str) -> None:
        t = raw.strip()
        if not t or t in seen:
            return
        seen.add(t)
        titles.append(t)

    for line in text.split("\n"):
        stripped = line.strip()
        if stripped.startswith("- title:"):
            push(stripped.split(":", 1)[-1])
            continue
        if line.startswith(("-", "*")):
            bullet = line.lstrip("-* ").split(":", 1)[0].split("：", 1)[0]
            if bullet.strip():
                push(bullet)

    roster = re.search(r"共\s*\d+\s*人[：:]\s*([^\n]+)", text)
    if roster:
        for part in re.split(r"[,，、]", roster.group(1)):
            push(part)

    if not titles:
        single = re.search(r"[·•]\s*([^：:]+)[：：]", text)
        if single:
            push(single.group(1))
    return titles


_CHAPTER_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def extract_chapter_read_labels(content: str, file_path: str = "") -> list[str]:
    """Chapter title from ReadChapter body (Content API markdown)."""
    _ = file_path
    from app.agent.harness.tool_display import split_frontmatter

    meta, _body = split_frontmatter(content)
    title = (meta.get("title") or "").strip()
    if not title:
        return ["章节正文"]
    return [f"《{title}》"]


def _preview_text(content: str, *, limit: int = 80) -> str:
    preview = content.replace("\n", " ")
    return preview[:limit] + "…" if len(preview) > limit else preview


def _attach_tool_display_excerpt(
    payload: dict[str, Any],
    name: str,
    content: str,
    file_path: str = "",
    *,
    tool_input: dict[str, Any] | None = None,
) -> None:
    """SSE/UI only — sets display_excerpt + output_summary, not model ToolMessage text.

    Full tool body for the LLM: step.completed display.content (see tool_result_routing).
    """
    from app.agent.harness.tool_display import format_tool_display_excerpt

    inp = dict(tool_input or {})
    if file_path:
        inp.setdefault("file_path", file_path)
    excerpt = format_tool_display_excerpt(name, content, file_path, tool_input=inp)
    if not excerpt:
        return
    payload["display_excerpt"] = excerpt
    first = excerpt.split("\n", 1)[0].strip()
    payload["output_summary"] = (
        first[:200] + "…" if len(first) > 200 else first
    ) or _preview_text(excerpt, limit=120)


def _attach_result_title(
    payload: dict[str, Any],
    name: str,
    content: str,
    file_path: str = "",
    *,
    tool_input: dict[str, Any] | None = None,
) -> None:
    from app.agent.harness.tool_ui import resolve_tool_result_title

    title = resolve_tool_result_title(name, content, tool_input=tool_input, file_path=file_path)
    if not title:
        return
    payload["display_excerpt"] = title
    payload["output_summary"] = title[:200] + ("…" if len(title) > 200 else "")


def _tool_completed_payload(
    *,
    name: str,
    display_name: str,
    content: str,
    failed: bool,
    display: DisplayPayload,
    file_path: str = "",
    tool_input: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build tool.completed SSE payload for the browser — not the model tool_result."""
    payload: dict[str, Any] = {
        "name": name,
        "display_name": display_name,
        "status": "error" if failed else "ok",
    }
    if file_path:
        payload["file_path"] = file_path
    if display.choices:
        payload["choices"] = display.choices
    if display.interaction:
        payload["interaction"] = display.interaction
    if not content and not failed:
        return payload

    if failed:
        payload["output_summary"] = _preview_text(content, limit=80)
        if len(content) <= 240:
            payload["output"] = content
        return payload

    if name == "output":
        if len(content) > 80:
            payload["output_summary"] = _preview_text(content)
        return payload

    if is_ask_user_tool(name):
        _attach_result_title(
            payload, name, content, file_path, tool_input=tool_input
        )
        return payload

    # All successful tools: single-line human title (never raw JSON acks).
    _attach_result_title(
        payload, name, content, file_path, tool_input=tool_input
    )
    return payload


_SSE_TOOL_INPUT_KEYS = (
    "file_path",
    "path",
    "chapter_id",
    "title",
    "index",
    "scope",
    "key",
    "query",
    "pattern",
    "glob_pattern",
    "content",
    "old_string",
    "new_string",
    "replace_all",
    "offset",
    "limit",
    "head_limit",
    "todos",
    "merge",
)

_SSE_OMIT_BODY_KEYS = frozenset({"content", "old_string", "new_string", "payload"})


def _tool_input_for_sse(tool: str, inp: dict[str, Any]) -> dict[str, Any]:
    """SSE tool_input: omit huge chapter bodies (model already has them in the turn)."""
    slim = {k: inp[k] for k in _SSE_TOOL_INPUT_KEYS if k in inp}
    if normalize_tool_name(tool) in (
        "WriteChapter",
        "EditChapter",
        "CreateMemory",
        "UpdateMemoryFields",
        "UpdateMemoryContent",
        "UpdateMemoryMeta",
        "Write",
        "Edit",
    ):
        for key in _SSE_OMIT_BODY_KEYS:
            slim.pop(key, None)
    return slim


def _normalize_interaction_for_sse(interaction: dict[str, Any] | None) -> dict[str, Any] | None:
    """Map CC AskUser interaction shape to frontend AgentInteractionPayload."""
    if not interaction:
        return None
    out = dict(interaction)
    kind = str(out.get("kind") or out.get("type") or "").strip()
    options = out.get("options") if isinstance(out.get("options"), list) else []
    questions = out.get("questions") if isinstance(out.get("questions"), list) else []
    if kind == "choose":
        out["type"] = "single_select" if options else "ask_user"
    elif kind == "ask_user":
        out["type"] = "ask_user" if questions else ("single_select" if options else "ask_user")
    elif kind and "type" not in out:
        out["type"] = kind
    if options and "choices" not in out:
        out["choices"] = options
    return out


def _enrich_read_chapter_tool_input(
    inp: dict[str, Any],
    context_patch: dict[str, Any] | None,
) -> dict[str, Any]:
    """Attach resolved chapter title/index for UI excerpts (body may lack frontmatter)."""
    out = dict(inp or {})
    patch = context_patch if isinstance(context_patch, dict) else {}
    target = patch.get("read_target")
    if isinstance(target, dict):
        title = str(target.get("title") or "").strip()
        if title:
            out.setdefault("title", title)
        cid = str(target.get("chapter_id") or "").strip()
        if cid:
            out.setdefault("chapter_id", cid)
        idx = target.get("index")
        try:
            idx_int = int(idx) if idx is not None else None
        except (TypeError, ValueError):
            idx_int = None
        if idx_int is not None and idx_int > 0:
            out.setdefault("index", idx_int)

    chapters: list[Any] = []
    if isinstance(patch, dict):
        rows = patch.get("chapters")
        if isinstance(rows, list):
            chapters = rows
    if not chapters:
        return out

    want_id = str(out.get("chapter_id") or "").strip()
    want_index = out.get("index")
    try:
        want_index_int = int(want_index) if want_index is not None else None
    except (TypeError, ValueError):
        want_index_int = None

    for row in chapters:
        if not isinstance(row, dict):
            continue
        row_id = str(row.get("chapter_id") or row.get("id") or "").strip()
        row_index = row.get("list_index")
        if row_index is None:
            row_index = row.get("index")
        try:
            row_index_int = int(row_index) if row_index is not None else 0
        except (TypeError, ValueError):
            row_index_int = 0
        if want_id and row_id == want_id:
            out.setdefault("title", str(row.get("title") or "").strip())
            if row_index_int > 0:
                out.setdefault("index", row_index_int)
            break
        if want_index_int is not None and row_index_int == want_index_int:
            out.setdefault("title", str(row.get("title") or "").strip())
            if row_id:
                out.setdefault("chapter_id", row_id)
            break
    return out


def build_tool_completed_sse_payload(
    tool: str,
    *,
    content: str,
    failed: bool = False,
    interaction: dict[str, Any] | None = None,
    tool_input: dict[str, Any] | None = None,
    context_patch: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """SSE tool.completed payload for CC tools (sse_bridge + display emitter)."""
    inp = dict(tool_input or {})
    patch = context_patch if isinstance(context_patch, dict) else {}
    if normalize_tool_name(tool) in (
        "ReadChapter",
        "EditChapter",
        "WriteChapter",
        "DeleteChapter",
    ):
        inp = _enrich_read_chapter_tool_input(inp, patch)
    file_path = str(inp.get("file_path") or "").strip()
    normalized_interaction = _normalize_interaction_for_sse(interaction)
    display = DisplayPayload(
        type="tool",
        tool=tool,
        content=content,
        interaction=normalized_interaction,
    )
    payload = _tool_completed_payload(
        name=tool,
        display_name=tool_display_name(tool, inp),
        content=content,
        failed=failed,
        display=display,
        file_path=file_path,
        tool_input=inp,
    )
    if normalized_interaction:
        payload["interaction"] = normalized_interaction
    if inp:
        payload["tool_input"] = _tool_input_for_sse(tool, inp)
    todos = patch.get("todos")
    if isinstance(todos, list) and todos:
        payload["todos"] = todos
    if patch.get("memory_async") == "scheduled":
        payload["memory_async"] = "scheduled"
    if patch.get("chapter_async") == "scheduled":
        payload["chapter_async"] = "scheduled"
    if patch.get("chapter_async") == "streamed":
        payload["chapter_async"] = "streamed"
    return payload


def emit_display_events(
    result: StepResult,
    *,
    run_id: str,
    session_id: str,
    message_id: str,
    think_step_id: str,
    message_step_id: str,
    sequence: int,
    tool_step_id: str | None = None,
    skip_tool_started: bool = False,
) -> tuple[list[dict[str, Any]], int]:
    """Return (events, next_sequence)."""
    events: list[dict[str, Any]] = []
    display = result.display

    if display.type == "none":
        return events, sequence

    if display.type == "think":
        title = display.title or "分析请求"
        events.append(
            build_event(
                event_type="think.started",
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=think_step_id,
                sequence=sequence,
                payload={"title": title},
            )
        )
        sequence += 1
        content = display.content or ""
        chunks = emit_sse_text_chunks(content) if display.stream else [content]
        for piece in chunks:
            if not piece:
                continue
            events.append(
                build_event(
                    event_type="think.delta",
                    run_id=run_id,
                    session_id=session_id,
                    message_id=message_id,
                    step_id=think_step_id,
                    sequence=sequence,
                    payload={"text": piece},
                )
            )
            sequence += 1
        events.append(
            build_event(
                event_type="think.completed",
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=think_step_id,
                sequence=sequence,
                payload={},
            )
        )
        sequence += 1
        return events, sequence

    if display.type == "message":
        events.append(
            build_event(
                event_type="message.started",
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=message_step_id,
                sequence=sequence,
                payload={"role": "assistant", "delivery": True},
            )
        )
        sequence += 1
        content = display.content or ""
        chunks = emit_sse_text_chunks(content) if display.stream else [content]
        for piece in chunks:
            if not piece:
                continue
            events.append(
                build_event(
                    event_type="message.delta",
                    run_id=run_id,
                    session_id=session_id,
                    message_id=message_id,
                    step_id=message_step_id,
                    sequence=sequence,
                    payload={"text": piece},
                )
            )
            sequence += 1
        events.append(
            build_event(
                event_type="message.completed",
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=message_step_id,
                sequence=sequence,
                payload={"role": "assistant", "delivery": True},
            )
        )
        sequence += 1
        return events, sequence

    if display.type == "tool":
        tool_events, sequence = _tool_events(
            result.step_kind,
            display,
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            sequence=sequence,
            tool_step_id=tool_step_id,
            skip_started=skip_tool_started,
        )
        events.extend(tool_events)
        return events, sequence

    return events, sequence


def _tool_events(
    tool_name: str,
    display: DisplayPayload,
    *,
    run_id: str,
    session_id: str,
    message_id: str,
    sequence: int,
    tool_step_id: str | None = None,
    skip_started: bool = False,
) -> tuple[list[dict[str, Any]], int]:
    events: list[dict[str, Any]] = []
    step_id = tool_step_id or f"step_{uuid4().hex}"
    name = display.tool or tool_name
    if is_hidden_ui_tool(name):
        return events, sequence
    display_name = (display.title or "").strip() or tool_display_name(name)
    if not skip_started:
        events.append(
            build_event(
                event_type="tool.started",
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=step_id,
                sequence=sequence,
                payload={"name": name, "display_name": display_name},
            )
        )
        sequence += 1
    content = (display.content or "").strip()
    _memory_fail_prefixes = (
        "记忆更新失败",
        "创建失败",
        "删除失败",
        "读取失败",
        "未提炼到",
    )
    failed = bool(
        content
        and (
            content.startswith(_memory_fail_prefixes)
            or "unsupported scope" in content
            or (name.startswith("memory") and content.startswith("HTTP"))
            or (name.startswith("memory") and content.startswith("key not found"))
            or (name.startswith("memory") and content.startswith("缺少 scope"))
            or (name.startswith("memory") and content.startswith("缺少 scope/key"))
        )
    )
    payload = _tool_completed_payload(
        name=name,
        display_name=display_name,
        content=content,
        failed=failed,
        display=display,
    )
    events.append(
        build_event(
            event_type="tool.completed",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=step_id,
            sequence=sequence,
            payload=payload,
        )
    )
    sequence += 1
    return events, sequence


def emit_skill_started(
    ctx: AgentRunContext,
    *,
    skill_id: str,
    name: str,
    sequence: int,
    step_id: str,
) -> dict[str, Any]:
    return build_event(
        event_type="skill.started",
        run_id=ctx.run_id,
        session_id=ctx.session_id,
        message_id=ctx.message_id,
        step_id=step_id,
        sequence=sequence,
        payload={"skill": {"id": skill_id, "name": name}},
    )


def emit_skill_loaded(
    ctx: AgentRunContext,
    *,
    skill_id: str,
    name: str,
    sequence: int,
    step_id: str,
) -> dict[str, Any]:
    return build_event(
        event_type="skill.loaded",
        run_id=ctx.run_id,
        session_id=ctx.session_id,
        message_id=ctx.message_id,
        step_id=step_id,
        sequence=sequence,
        payload={"skill": {"id": skill_id, "name": name}},
    )


def emit_skill_failed(
    ctx: AgentRunContext,
    *,
    skill_id: str,
    name: str,
    error: str,
    sequence: int,
    step_id: str,
) -> dict[str, Any]:
    return build_event(
        event_type="skill.failed",
        run_id=ctx.run_id,
        session_id=ctx.session_id,
        message_id=ctx.message_id,
        step_id=step_id,
        sequence=sequence,
        payload={
            "skill": {"id": skill_id, "name": name},
            "error": (error or "skill load failed")[:500],
        },
    )


def assistant_message_events(
    *,
    run_id: str,
    session_id: str,
    message_id: str,
    sequence: int,
    text: str,
    stream: bool = True,
) -> tuple[list[dict[str, Any]], int]:
    """Emit assistant chat body (message.*) for the editor timeline."""
    content = (text or "").strip()
    if not content:
        return [], sequence
    message_step_id = f"step_msg_{uuid4().hex[:8]}"
    events: list[dict[str, Any]] = []
    events.append(
        build_event(
            event_type="message.started",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=message_step_id,
            sequence=sequence,
            payload={"role": "assistant"},
        )
    )
    sequence += 1
    chunks = emit_sse_text_chunks(content) if stream else [content]
    for piece in chunks:
        if not piece:
            continue
        events.append(
            build_event(
                event_type="message.delta",
                run_id=run_id,
                session_id=session_id,
                message_id=message_id,
                step_id=message_step_id,
                sequence=sequence,
                payload={"text": piece},
            )
        )
        sequence += 1
    events.append(
        build_event(
            event_type="message.completed",
            run_id=run_id,
            session_id=session_id,
            message_id=message_id,
            step_id=message_step_id,
            sequence=sequence,
            payload={"role": "assistant"},
        )
    )
    sequence += 1
    return events, sequence
