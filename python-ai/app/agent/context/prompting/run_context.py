"""Run-layer context bundle — single injection surface for main loop and tools."""

from __future__ import annotations

import json
from typing import Any, Literal

from app.agent.backend.memory_catalog import (
    extract_scope_root_ids,
    format_memory_index,
    load_all_memory_trees,
)
from app.agent.context.compact import (
    format_chapter_catalog_db,
    format_chapter_window,
)
from app.agent.context.memory_log import memory_ops_for_plan_json
from app.agent.context.prompting.blocks import json_block
from app.agent.harness.intent_message import intent_user_message_for_context
from app.agent.harness.orchestration_contract import context_decision_hints
from app.agent.harness.plan_context import (
    _transcript_has_interaction,
    summarize_memory_delete,
    summarize_memory_patch,
    summarize_memory_read,
    think_has_pending_confirm_from_rows,
    think_text_from_rows,
)
from app.agent.harness.routing import format_dialogue_history, project_summary_from_ctx
from app.agent.schemas import AgentRunContext, PlanRequest
from app.agent.tools.todo_helpers import working_todos_from_patch

ContextProfile = Literal["full", "tool"]

_USER_MESSAGE_MAX = 800
_DIALOGUE_MAX = 1600
_THINK_SUMMARY_MAX = 1200
_CHAPTER_FOCUS_MIN = 12
_TRANSCRIPT_TAIL = 40

LIBRARY_BLOCK_MAX_CHARS = 6000
MAX_CHAPTER_TITLES = 80
SUMMARY_MAX_CHARS = 800
_LIBRARY_HINT = (
    "用户 @引用的参考书目。需要书中细节时，用 SearchKnowledge 工具并设 scope=book:<catalog_novel_id> 检索。"
)


def _truncate_summary(summary: str) -> str:
    text = str(summary or "")
    if len(text) <= SUMMARY_MAX_CHARS:
        return text
    return text[:SUMMARY_MAX_CHARS] + "…"


def _truncate_chapter_titles(titles: list[Any]) -> list[Any]:
    clean = [str(title) for title in titles if str(title).strip()]
    if len(clean) <= MAX_CHAPTER_TITLES:
        return clean
    extra = len(clean) - MAX_CHAPTER_TITLES
    return clean[:MAX_CHAPTER_TITLES] + [f"…(+{extra} more)"]


def _format_referenced_book(book: dict[str, Any]) -> dict[str, Any]:
    titles = book.get("chapterTitles") or book.get("chapter_titles") or []
    chapter_titles = _truncate_chapter_titles(titles if isinstance(titles, list) else [])
    return {
        "title": book.get("title", ""),
        "summary": _truncate_summary(str(book.get("summary", ""))),
        "chapter_titles": chapter_titles,
        "catalog_novel_id": book.get("catalogNovelId")
        or book.get("catalog_novel_id")
        or "",
        "index_status": book.get("indexStatus") or book.get("index_status") or "",
    }


def _build_library_block(referenced_books: list[dict[str, Any]]) -> dict[str, Any]:
    books: list[dict[str, Any]] = []
    base = {"books": books, "hint": _LIBRARY_HINT}
    base_len = len(json.dumps(base, ensure_ascii=False))
    for book in referenced_books:
        if not isinstance(book, dict):
            continue
        formatted = _format_referenced_book(book)
        candidate = {"books": books + [formatted], "hint": _LIBRARY_HINT}
        if len(json.dumps(candidate, ensure_ascii=False)) > LIBRARY_BLOCK_MAX_CHARS:
            break
        books.append(formatted)
    return base


def assemble_agent_context(
    ctx: AgentRunContext,
    *,
    tool_input: dict[str, Any] | None = None,
    transcript_rows: list[dict[str, Any]] | None = None,
    think_content: str = "",
    retry_feedback: str = "",
    include_dialogue: bool = True,
    profile: ContextProfile = "full",
) -> dict[str, Any]:
    """Single structured context for LLM injection — no duplicate plan/run blocks."""
    patch = ctx.context_patch if isinstance(ctx.context_patch, dict) else {}
    inp = tool_input or {}
    rows = transcript_rows or []
    has_interaction = _transcript_has_interaction(rows)

    intent: dict[str, Any] = {
        "user_message": intent_user_message_for_context(
            str(ctx.user_message or ""),
            has_run_interaction=has_interaction,
        )[:_USER_MESSAGE_MAX],
        "mode": ctx.mode,
    }
    if ctx.selected_choice and has_interaction:
        intent["selected_choice"] = ctx.selected_choice
    if profile == "full":
        if isinstance(rows, list):
            for row in reversed(rows):
                if isinstance(row, dict) and row.get("kind") == "interaction":
                    intent["latest_interaction"] = str(row.get("summary") or "")[:1200]
                    break
        if has_interaction:
            interactions = patch.get("user_interactions")
            if isinstance(interactions, list) and interactions:
                last = interactions[-1]
                if isinstance(last, dict) and last.get("text"):
                    intent.setdefault("latest_interaction", str(last["text"])[:1200])

    out: dict[str, Any] = {
        "intent": intent,
        "decision_hints": context_decision_hints(),
    }

    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    novel: dict[str, Any] = {}
    if novel_id:
        novel["novel_id"] = novel_id
    project = project_summary_from_ctx(ctx)
    if project:
        novel["project"] = project[:600]

    chapters = [ch for ch in (ctx.chapters or []) if isinstance(ch, dict) and ch.get("id")]
    if chapters:
        catalog = format_chapter_catalog_db(ctx)
        if catalog:
            novel["chapter_catalog"] = catalog[:6500]
        if len(chapters) >= _CHAPTER_FOCUS_MIN:
            focus = format_chapter_window(ctx)
            if focus:
                novel["chapter_focus"] = focus[:1200]
        novel["chapter_count"] = len(chapters)
        written = sum(
            1
            for ch in chapters
            if int(ch.get("word_count") or ch.get("wordCount") or 0) >= 100
        )
        novel["chapters_written_count"] = written
        novel["chapters_pending_count"] = max(0, len(chapters) - written)
    elif novel_id:
        novel["chapter_count"] = 0
        novel["chapters_written_count"] = 0
        novel["chapters_pending_count"] = 0

    if novel:
        out["novel"] = novel

    memory: dict[str, Any] = {}
    if novel_id and ctx.user_id > 0:
        mem_trees = load_all_memory_trees(ctx)
        mem_index = format_memory_index(ctx, trees=mem_trees or None)
        if mem_index:
            memory["memory_index"] = mem_index[:5000]
        scope_roots = extract_scope_root_ids(mem_trees) if mem_trees else {}
        if scope_roots:
            memory["scope_root_ids"] = scope_roots

    roster = patch.get("character_roster")
    if isinstance(roster, list) and roster:
        memory["character_roster"] = roster[:40]
    last_read = patch.get("last_memory_read")
    if isinstance(last_read, dict) and last_read.get("ok"):
        memory["last_read"] = summarize_memory_read(last_read)
    last_write = patch.get("last_memory_patch")
    if isinstance(last_write, dict):
        memory["last_write"] = summarize_memory_patch(last_write)
    last_delete = patch.get("last_memory_delete")
    if isinstance(last_delete, dict):
        memory["last_delete"] = summarize_memory_delete(last_delete)
    reads_session = patch.get("memory_reads_session")
    if isinstance(reads_session, list) and reads_session:
        memory["reads_session"] = reads_session[-8:]
    ops = memory_ops_for_plan_json(patch.get("memory_ops_log"))
    if ops:
        memory["ops_log"] = ops
        ok_creates = sum(
            1 for row in ops if row.get("tool") == "CreateMemory" and row.get("ok")
        )
        if ok_creates >= 2:
            memory["create_memory_ok_count"] = ok_creates
    if memory:
        out["memory"] = memory

    if ctx.referenced_books:
        out["library"] = _build_library_block(
            [b for b in ctx.referenced_books if isinstance(b, dict)]
        )

    _patch = ctx.context_patch if isinstance(ctx.context_patch, dict) else {}
    skill_prompt = (ctx.skill_prompt or "").strip()
    if not skill_prompt:
        patch_prompt = _patch.get("skill_prompt")
        if isinstance(patch_prompt, str):
            skill_prompt = patch_prompt.strip()
    skill_ids = list(ctx.skill_ids or [])
    if not skill_ids:
        patch_ids = _patch.get("skill_ids")
        if isinstance(patch_ids, list):
            skill_ids = [row for row in patch_ids if isinstance(row, dict)]
    if skill_prompt:
        out["skills"] = {
            "active": [str(s.get("name") or "").strip() for s in skill_ids if s.get("name")],
            "prompt": skill_prompt[:4000],
        }

    session: dict[str, Any] = {}
    think = think_text_from_rows(
        rows,
        think_content=think_content,
        think_summary=str(patch.get("think_summary") or ""),
    )
    if not think and inp.get("context"):
        think = str(inp.get("context") or "")[:_THINK_SUMMARY_MAX]
    if think:
        session["think"] = think[:4000]
        if think_has_pending_confirm_from_rows(think, rows):
            session["think_has_pending_confirm"] = True

    if profile == "full" and isinstance(rows, list) and rows:
        session["transcript"] = rows[-_TRANSCRIPT_TAIL:]

    relevant = patch.get("relevant_context")
    if isinstance(relevant, list) and relevant:
        session["relevant_context"] = relevant[:5]

    todos = working_todos_from_patch(patch)
    if todos:
        session["todos"] = todos[:20]
        open_count = sum(
            1 for t in todos if str(t.get("status") or "") in ("pending", "in_progress")
        )
        session["todos_open_count"] = open_count
    if session:
        out["session"] = session

    if include_dialogue and profile == "full":
        dialogue = format_dialogue_history(
            ctx,
            max_len=_DIALOGUE_MAX,
            transcript=rows,
        )
        if dialogue:
            out["dialogue"] = dialogue[:_DIALOGUE_MAX]

    run: dict[str, Any] = {
        "step_index": ctx.step_index,
    }
    if ctx.last_tool:
        run["last_tool"] = ctx.last_tool
    if ctx.last_reason:
        run["last_reason"] = str(ctx.last_reason or "")[:240]
    if ctx.last_tool == "output":
        lr = str(ctx.last_reason or "")
        if "output continue" in lr:
            run["prior_output"] = "continue"
        elif "output ok" in lr:
            run["prior_output"] = "done"
    out["run"] = run

    if retry_feedback.strip():
        out["retry"] = retry_feedback.strip()[:500]

    return out


def assemble_run_context(
    ctx: AgentRunContext,
    *,
    tool_input: dict[str, Any] | None = None,
    include_think_summary: bool = True,
    include_dialogue: bool = True,
    transcript_rows: list[dict[str, Any]] | None = None,
    profile: ContextProfile = "full",
) -> dict[str, Any]:
    """Backward-compatible alias — prefer assemble_agent_context."""
    think_summary = ""
    if include_think_summary:
        patch = ctx.context_patch if isinstance(ctx.context_patch, dict) else {}
        think_summary = str(patch.get("think_summary") or "")
    return assemble_agent_context(
        ctx,
        tool_input=tool_input,
        transcript_rows=transcript_rows,
        think_content=think_summary,
        include_dialogue=include_dialogue,
        profile=profile,
    )


def assemble_run_context_from_plan_req(
    req: PlanRequest,
    *,
    tool_input: dict[str, Any] | None = None,
    include_think_summary: bool = True,
) -> dict[str, Any]:
    from app.agent.harness.plan_context import think_text_for_plan

    rows = getattr(req, "transcript", None) or []
    think = think_text_for_plan(req) if include_think_summary else ""
    return assemble_agent_context(
        req.context,
        tool_input=tool_input,
        transcript_rows=rows if isinstance(rows, list) else [],
        think_content=think,
        profile="full",
    )


def format_agent_context_block(
    ctx: AgentRunContext,
    *,
    tool_input: dict[str, Any] | None = None,
    transcript_rows: list[dict[str, Any]] | None = None,
    think_content: str = "",
    retry_feedback: str = "",
    profile: ContextProfile = "full",
) -> str:
    payload = assemble_agent_context(
        ctx,
        tool_input=tool_input,
        transcript_rows=transcript_rows,
        think_content=think_content,
        retry_feedback=retry_feedback,
        include_dialogue=profile == "full",
        profile=profile,
    )
    return json_block("RUN_CONTEXT_JSON", payload)


def format_run_context_block(
    ctx: AgentRunContext,
    *,
    tool_input: dict[str, Any] | None = None,
    include_think_summary: bool = True,
    transcript_rows: list[dict[str, Any]] | None = None,
    profile: ContextProfile = "tool",
) -> str:
    return format_agent_context_block(
        ctx,
        tool_input=tool_input,
        transcript_rows=transcript_rows,
        think_content=(
            str((ctx.context_patch or {}).get("think_summary") or "")
            if include_think_summary
            else ""
        ),
        profile=profile,
    )
