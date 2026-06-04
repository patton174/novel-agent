"""Map StepResult.display to agent-event payloads."""

from __future__ import annotations

import re
from typing import Any
from uuid import uuid4

from app.agent_step.cc_visibility import (
    is_ask_user_tool,
    is_chapter_vfs_path,
    is_hidden_ui_tool,
    is_memory_vfs_path,
    normalize_tool_name,
    should_emit_read_result_labels,
    tool_display_name as cc_tool_display_name,
    vfs_path_from_tool_input,
)
from app.agent_step.schemas import DisplayPayload, StepResult
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


def extract_chapter_memory_read_labels(content: str, file_path: str) -> list[str]:
    """Human title for Read on /memory/chapter/{uuid}.json (not the UUID key)."""
    norm = (file_path or "").replace("\\", "/")
    if "/memory/chapter/" not in norm:
        return []
    text = (content or "").strip()
    title = ""
    for line in text.split("\n"):
        stripped = line.strip()
        if stripped.startswith("- title:"):
            raw = stripped.split(":", 1)[-1].strip()
            if raw and not _CHAPTER_UUID_RE.match(raw):
                title = raw
                break
    if not title and "---" in text:
        body = text.split("---", 1)[-1].strip()
    else:
        body = text
    if not title:
        m = re.search(r"^#\s*(第\s*\d+\s*章[^#\n]+)", body, re.MULTILINE)
        if m:
            title = re.sub(r"\s*摘要\s*$", "", m.group(1).strip())
    if not title:
        m = re.search(r"《([^》]+)》", body)
        if m:
            title = f"《{m.group(1)}》"
    if not title:
        return []
    return [title]


def extract_chapter_read_labels(content: str, file_path: str) -> list[str]:
    """Chapter title from Read body (Content API markdown), not the .md VFS path."""
    from app.agent_step.tool_display import split_frontmatter

    if not is_chapter_vfs_path(file_path):
        return []
    meta, _body = split_frontmatter(content)
    title = (meta.get("title") or "").strip()
    if not title:
        return ["章节正文"]
    li_raw = meta.get("list_index", "")
    try:
        idx = int(li_raw)
    except (TypeError, ValueError):
        idx = 0
    if idx > 0:
        return [f"《{title}》·作品列表第{idx}章"]
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
    from app.agent_step.tool_display import format_tool_display_excerpt

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
    if not content:
        return payload

    if should_emit_read_result_labels(name, file_path) or name == "memory_read":
        norm_path = (file_path or "").replace("\\", "/")
        if (
            file_path
            and "/memory/chapter/" in norm_path
            and normalize_tool_name(name) == "Read"
        ):
            labels = extract_chapter_memory_read_labels(content, file_path)
        elif file_path and is_chapter_vfs_path(file_path) and normalize_tool_name(name) == "Read":
            labels = extract_chapter_read_labels(content, file_path)
        else:
            labels = extract_memory_read_labels(content)
            labels = [
                x
                for x in labels
                if x.strip() and not _CHAPTER_UUID_RE.match(x.strip())
            ]
        if labels:
            payload["result_labels"] = labels
        _attach_tool_display_excerpt(
            payload, name, content, file_path, tool_input=tool_input
        )
        excerpt = str(payload.get("display_excerpt") or "")
        payload["output_summary"] = (
            excerpt.split("\n", 1)[0][:200]
            if excerpt
            else (labels[0] if labels else _preview_text(content))
        )
        return payload

    canonical = normalize_tool_name(name)
    is_chapter_io = (
        canonical in ("Write", "Edit", "Delete")
        and file_path
        and is_chapter_vfs_path(file_path)
    )
    is_memory_mutation = name.startswith("memory_") or (
        canonical in ("Write", "Edit", "Delete")
        and file_path
        and is_memory_vfs_path(file_path)
    )
    if is_chapter_io and not failed and canonical in ("Write", "Edit"):
        _attach_tool_display_excerpt(
            payload, name, content, file_path, tool_input=tool_input
        )
        if payload.get("display_excerpt"):
            payload["output_summary"] = str(payload["display_excerpt"]).split("\n", 1)[0][:200]
        return payload
    if is_memory_mutation and not failed:
        _attach_tool_display_excerpt(
            payload, name, content, file_path, tool_input=tool_input
        )
        label = str(payload.get("display_excerpt") or content.split("\n", 1)[0].strip())
        payload["action_label"] = label[:120] + ("…" if len(label) > 120 else "")
        payload["output_summary"] = payload["action_label"]
        return payload
    if is_memory_mutation and failed:
        payload["output"] = content
        payload["status"] = "error"
        payload["output_summary"] = _preview_text(content)
        return payload

    if is_ask_user_tool(name) and not failed:
        _attach_tool_display_excerpt(
            payload, name, content, file_path, tool_input=tool_input
        )
        if payload.get("display_excerpt"):
            payload["output_summary"] = str(payload["display_excerpt"])[:200]
        return payload

    canonical_del = normalize_tool_name(name)
    if canonical_del == "Delete" and not failed:
        _attach_tool_display_excerpt(
            payload, name, content, file_path, tool_input=tool_input
        )
        if payload.get("display_excerpt"):
            payload["output_summary"] = str(payload["display_excerpt"])[:200]
        return payload

    if failed or name == "output":
        payload["output"] = content
        if len(content) > 80:
            payload["output_summary"] = _preview_text(content)
        return payload

    if canonical in ("Glob", "Grep") or name == "context_search":
        from app.agent_step.tool_display import strip_inventory_headers_for_ui

        _attach_tool_display_excerpt(
            payload, name, content, file_path, tool_input=tool_input
        )
        body = strip_inventory_headers_for_ui(content)
        payload["output"] = body
        excerpt = str(payload.get("display_excerpt") or "")
        payload["output_summary"] = (
            excerpt[:200] if excerpt else _preview_text(body, limit=120)
        )
        return payload

    _attach_tool_display_excerpt(
        payload, name, content, file_path, tool_input=tool_input
    )
    if payload.get("display_excerpt"):
        payload["output_summary"] = str(payload["display_excerpt"]).split("\n", 1)[0][:200]
        return payload

    if len(content) <= 240:
        payload["output_summary"] = _preview_text(content)
        return payload

    first_line = content.split("\n", 1)[0].strip()
    payload["output_summary"] = (
        first_line[:120] + "…" if len(first_line) > 120 else first_line
    )
    return payload


_SSE_TOOL_INPUT_KEYS = (
    "file_path",
    "path",
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

_SSE_OMIT_BODY_KEYS = frozenset({"content", "old_string", "new_string"})


def _tool_input_for_sse(tool: str, inp: dict[str, Any]) -> dict[str, Any]:
    """SSE tool_input: omit huge chapter bodies (model already has them in the turn)."""
    slim = {k: inp[k] for k in _SSE_TOOL_INPUT_KEYS if k in inp}
    if normalize_tool_name(tool) in ("Write", "Edit"):
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
    file_path = vfs_path_from_tool_input(inp)
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
    patch = context_patch if isinstance(context_patch, dict) else {}
    todos = patch.get("todos")
    if isinstance(todos, list) and todos:
        payload["todos"] = todos
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
                payload={"role": "assistant"},
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
                payload={"role": "assistant"},
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
