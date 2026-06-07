"""Run-layer context bundle — shared thin slice for think / tools."""

from __future__ import annotations

from typing import Any

from app.agent.backend.memory_catalog import format_memory_catalog_db
from app.agent.context.compact import (
    CHAPTER_INFO_CHAIN_FOR_PROMPT,
    compact_story_memory_text,
    format_chapter_catalog_db,
    format_chapter_window,
)
from app.agent.context.prompting.blocks import json_block
from app.agent.harness.intent_message import intent_user_message_for_context
from app.agent.harness.orchestration_contract import MAIN_LOOP_TOOLS
from app.agent.harness.plan_context import _transcript_has_interaction, think_text_for_plan
from app.agent.harness.routing import format_dialogue_history, project_summary_from_ctx
from app.agent.schemas import AgentRunContext, PlanRequest

_USER_MESSAGE_MAX = 800
_DIALOGUE_MAX = 1600
_STORY_SNAPSHOT_MAX = 800
_THINK_SUMMARY_MAX = 1200


def assemble_run_context(
    ctx: AgentRunContext,
    *,
    tool_input: dict[str, Any] | None = None,
    include_think_summary: bool = True,
    include_dialogue: bool = True,
    transcript_rows: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Session + novel + working set — injected into Tool / Think Human messages."""
    patch = ctx.context_patch if isinstance(ctx.context_patch, dict) else {}
    inp = tool_input or {}

    intent: dict[str, Any] = {
        "user_message": intent_user_message_for_context(
            str(ctx.user_message or ""),
            has_run_interaction=_transcript_has_interaction(transcript_rows or []),
        )[:_USER_MESSAGE_MAX],
        "mode": ctx.mode,
    }

    if ctx.selected_choice and _transcript_has_interaction(transcript_rows or []):
        intent["selected_choice"] = ctx.selected_choice

    novel: dict[str, Any] = {}
    nid = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if nid:
        novel["novel_id"] = nid
        novel["vfs_root"] = f"/novel/{nid}/"
    project = project_summary_from_ctx(ctx)
    if project:
        novel["project"] = project[:600]
    last_list = patch.get("last_chapter_list")
    list_text = last_list.strip() if isinstance(last_list, str) else ""
    list_is_empty = "暂无章节" in list_text if list_text else False

    chapters = [ch for ch in (ctx.chapters or []) if isinstance(ch, dict) and ch.get("id")]
    if list_is_empty:
        chapters = []
    if chapters:
        catalog = format_chapter_catalog_db(ctx)
        if catalog:
            novel["chapter_catalog"] = catalog[:6500]
        chapter_window = format_chapter_window(ctx)
        if chapter_window:
            novel["chapter_window"] = chapter_window[:1200]
        novel["chapter_count"] = len(chapters)
        written = sum(
            1
            for ch in chapters
            if int(ch.get("word_count") or ch.get("wordCount") or 0) >= 100
        )
        novel["chapters_written_count"] = written
        novel["chapters_pending_count"] = max(0, len(chapters) - written)
    elif list_is_empty:
        novel["chapter_count"] = 0
        novel["chapters_written_count"] = 0
        novel["chapters_pending_count"] = 0
    if list_text:
        novel["chapter_list_full"] = list_text[:4500]

    memory: dict[str, Any] = {}
    mem_catalog = format_memory_catalog_db(ctx)
    if mem_catalog:
        memory["memory_catalog"] = mem_catalog[:4500]
    story = compact_story_memory_text(str(ctx.story_memory or ""), max_len=_STORY_SNAPSHOT_MAX)
    if story:
        memory["story_snapshot"] = story
    roster = patch.get("character_roster")
    if isinstance(roster, list) and roster:
        memory["character_roster"] = roster[:40]
    last_read = patch.get("last_memory_read")
    if isinstance(last_read, dict) and last_read.get("ok"):
        memory["last_read_scope"] = str(last_read.get("scope") or "")
    last_vfs = patch.get("last_read")
    if isinstance(last_vfs, dict) and last_vfs.get("ok"):
        hint = f"已 Read `{str(last_vfs.get('path') or '')[:120]}`"
        if last_vfs.get("needs_continue"):
            hint += f"；需续读 offset={last_vfs.get('next_offset')}"
        elif last_vfs.get("has_body") is False:
            hint += "；切片未见 --- 正文，请续读或省略 limit"
        memory["last_read_hint"] = hint

    working: dict[str, Any] = {}
    if include_think_summary:
        think = str(patch.get("think_summary") or "").strip()
        if not think and inp.get("context"):
            think = str(inp.get("context") or "")[:_THINK_SUMMARY_MAX]
        if think:
            working["think_summary"] = think[:_THINK_SUMMARY_MAX]

    from app.agent.harness.routing import story_context_from_ctx

    snippet = story_context_from_ctx(ctx)
    if snippet:
        working["story_snippet"] = snippet[:4000]

    relevant = patch.get("relevant_context")
    if isinstance(relevant, list) and relevant:
        working["relevant_context"] = relevant[:5]

    out: dict[str, Any] = {
        "intent": intent,
        "capabilities": _run_capabilities(),
        "chapter_info_chain": CHAPTER_INFO_CHAIN_FOR_PROMPT,
    }
    if novel:
        out["novel"] = novel
    if memory:
        out["memory"] = memory
    if working:
        out["working"] = working
    if include_dialogue:
        dialogue = format_dialogue_history(
            ctx,
            max_len=_DIALOGUE_MAX,
            transcript=transcript_rows,
        )
        if dialogue:
            out["dialogue"] = dialogue[:_DIALOGUE_MAX]
    if ctx.last_tool:
        out["run"] = {
            "step_index": ctx.step_index,
            "last_tool": ctx.last_tool,
            "last_reason": str(ctx.last_reason or "")[:240],
        }
    return out


def assemble_run_context_from_plan_req(
    req: PlanRequest,
    *,
    tool_input: dict[str, Any] | None = None,
    include_think_summary: bool = True,
) -> dict[str, Any]:
    base = assemble_run_context(
        req.context,
        tool_input=tool_input,
        include_think_summary=include_think_summary,
    )
    think = think_text_for_plan(req)
    if think:
        working = dict(base.get("working") or {})
        working["think_full"] = think[:4000]
        base["working"] = working
    return base


def format_run_context_block(
    ctx: AgentRunContext,
    *,
    tool_input: dict[str, Any] | None = None,
    include_think_summary: bool = True,
    transcript_rows: list[dict[str, Any]] | None = None,
) -> str:
    return json_block(
        "RUN_CONTEXT_JSON",
        assemble_run_context(
            ctx,
            tool_input=tool_input,
            include_think_summary=include_think_summary,
            transcript_rows=transcript_rows,
        ),
    )


def _run_capabilities() -> list[str]:
    return sorted(MAIN_LOOP_TOOLS)
