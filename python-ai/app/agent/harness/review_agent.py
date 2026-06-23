"""Auto-spawned read-only review sub-agent after chapter writes."""

from __future__ import annotations

import logging
from typing import Any

from app.agent.harness.subagent_policy import subagent_depth
from app.agent.schemas import AgentRunContext
from app.agent.tools.tool import ToolCallResult
from app.config import settings

logger = logging.getLogger(__name__)

REVIEW_DESCRIPTION = "审查：全书连贯性与最近改动"

_PATCH_REVIEW_AGENT = "_review_agent"
_PATCH_CHANGED_IDS = "_review_changed_chapter_ids"

REVIEW_AGENT_ALLOWED_TOOLS = frozenset(
    {
        "ListChapters",
        "ReadChapter",
        "ListMemory",
        "ReadMemory",
        "ChapterAudit",
        "NarrativeReview",
        "SearchKnowledge",
        "GetCharacterGraph",
    }
)

REVIEW_TRIGGER_TOOLS = frozenset(
    {
        "WriteChapter",
        "EditChapter",
        "DeleteChapter",
        "ReorderChapters",
        "Agent",
    }
)

CHAPTER_MUTATION_TOOLS = frozenset(
    {
        "WriteChapter",
        "EditChapter",
        "DeleteChapter",
    }
)


def is_review_agent(ctx: AgentRunContext) -> bool:
    patch = ctx.context_patch if isinstance(ctx.context_patch, dict) else {}
    return bool(patch.get(_PATCH_REVIEW_AGENT))


def build_review_subagent_system_prompt() -> str:
    names = ", ".join(sorted(REVIEW_AGENT_ALLOWED_TOOLS))
    return f"""You are a **read-only narrative QA sub-agent** (editor / continuity checker).

Available tools: {names}

Rules:
- **Never** write or mutate chapters/memory (no WriteChapter, EditChapter, DeleteChapter, Agent).
- Run **ChapterAudit** and **NarrativeReview(scope=full_book)** for the whole book; focus ReadChapter on changed chapters.
- Check: semantic & literal duplication, chapter-to-chapter continuity, outline drift, worldview, foreshadow payoffs, reader engagement.
- Use ReadMemory(novel/world/chapter) and SearchKnowledge when needed.
- Final turn without tools: write the full markdown report (## 必须修 / ## 建议修 / ## 可选优化)."""


def build_review_subagent_run_context_human(ctx: AgentRunContext, transcript: Any) -> str:
    from app.agent.harness.message_history import build_run_context_human

    base = build_run_context_human(ctx, transcript)
    desc = str((ctx.context_patch or {}).get("_subagent_description") or "").strip()
    ids = ctx.context_patch.get(_PATCH_CHANGED_IDS) if isinstance(ctx.context_patch, dict) else []
    focus = ", ".join(str(x) for x in ids[:12]) if isinstance(ids, list) and ids else "见 chapter_catalog"
    return (
        f"【审查 Agent】{desc}\n优先改动章节：{focus}\n\n"
        f"{base}\n\n"
        "完成 ChapterAudit + NarrativeReview(full_book) 后，写完整审查报告（无工具轮）。"
    )


def record_chapter_mutation(
    ctx: AgentRunContext,
    tool: str,
    context_patch: dict[str, Any] | None,
) -> AgentRunContext:
    if tool not in CHAPTER_MUTATION_TOOLS or not isinstance(context_patch, dict):
        return ctx
    patch = dict(ctx.context_patch or {})
    ids = list(patch.get("run_changed_chapter_ids") or [])
    cw = context_patch.get("chapter_write")
    if isinstance(cw, dict):
        cid = str(cw.get("chapter_id") or "").strip()
        if cid and cid not in ids:
            ids.append(cid)
    deleted = context_patch.get("chapter_delete")
    if isinstance(deleted, dict):
        for raw in deleted.get("deleted") or []:
            cid = str(raw).strip()
            if cid and cid not in ids:
                ids.append(cid)
    if ids:
        patch["run_changed_chapter_ids"] = ids
    patch["run_needs_review"] = True
    return ctx.model_copy(update={"context_patch": patch})


def mark_batch_needs_review(ctx: AgentRunContext) -> AgentRunContext:
    patch = dict(ctx.context_patch or {})
    patch["run_needs_review"] = True
    return ctx.model_copy(update={"context_patch": patch})


def _build_review_prompt(changed_ids: list[str]) -> str:
    focus = ", ".join(changed_ids[:12]) if changed_ids else "（见 RUN_CONTEXT chapter_catalog）"
    return f"""审查本轮小说改动，并放在**全书**背景下评估连贯性。

## 改动章节（优先细读）
{focus}

## 步骤
1. ChapterAudit
2. NarrativeReview — `scope=full_book`，`focus_chapter_ids`=[{focus}]，全部 check 开启
3. 每个改动章：ReadChapter + ReadMemory(scope=chapter)
4. ReadMemory(novel/world) 核对大纲与设定；必要时 SearchKnowledge

最后一轮无工具时写完整报告。"""


async def run_review_subagent(
    parent: AgentRunContext,
    *,
    changed_chapter_ids: list[str] | None = None,
) -> ToolCallResult:
    if subagent_depth(parent) >= settings.agent_subagent_max_depth:
        return ToolCallResult(
            content="<tool_use_error>已在子 Agent 内，跳过嵌套审查 Agent。</tool_use_error>",
            is_error=True,
        )

    from app.agent.harness.review_agent_sse import stream_review_subagent

    summary = ""
    is_error = False
    review_patch: dict[str, Any] = {"run_needs_review": False}
    async for event in stream_review_subagent(
        parent,
        changed_chapter_ids=changed_chapter_ids,
        sequence=0,
    ):
        if not isinstance(event, dict):
            continue
        et = str(event.get("type") or "")
        payload = event.get("payload") if isinstance(event.get("payload"), dict) else {}
        if et == "subagent.completed":
            summary = str(payload.get("summary_preview") or "").strip()
            cp = payload.get("context_patch")
            if isinstance(cp, dict):
                review_patch = cp
        elif et == "subagent.failed":
            is_error = True
            summary = str(payload.get("error") or "审查 Agent 失败").strip()
            cp = payload.get("context_patch")
            if isinstance(cp, dict):
                review_patch = cp

    if not summary and is_error:
        summary = "<tool_use_error>审查 Agent 失败。</tool_use_error>"

    return ToolCallResult(
        content=summary,
        is_error=is_error,
        context_patch=review_patch,
    )
