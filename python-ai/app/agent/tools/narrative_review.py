"""Narrative quality review — continuity, outline, worldview, foreshadow, engagement."""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Literal

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.agent.backend import chapter_client
from app.agent.backend.memory_store import _read_memory_json_impl
from app.agent.backend.chapter_meta import sorted_chapter_summaries
from app.agent.backend.memory_catalog import load_story_memory_tree
from app.agent.schemas import AgentRunContext
from app.agent.tools.chapter_position import chapter_row_id
from app.agent.tools.schemas import NarrativeReviewInput, NarrativeReviewScope
from app.agent.tools.semantic_duplicate import find_semantic_duplicates
from app.agent.tools.tool import ToolCallResult, build_tool
from app.agent.harness.structured_llm import invoke_structured_with_retry
from app.core.llm import llm_provider

logger = logging.getLogger(__name__)

_REVIEW_TAIL_CHARS = 900
_REVIEW_HEAD_CHARS = 1200
_REVIEW_BODY_MID_CHARS = 2000
_OUTLINE_MAX = 4500
_WORLD_MAX = 3500
_MEMORY_MAX = 1200
_DEFAULT_REVIEW_CHAPTERS = 3
_MIN_PARA_DUP_LEN = 72

ReviewDimension = Literal[
    "continuity",
    "outline",
    "worldview",
    "foreshadow",
    "duplicate",
    "engagement",
]

ReviewSeverity = Literal["critical", "warning", "info"]


class ReviewFinding(BaseModel):
    severity: ReviewSeverity
    dimension: ReviewDimension
    chapter_id: str | None = None
    title: str = Field(..., min_length=1)
    detail: str = Field(..., min_length=1)
    fix_hint: str = ""


class NarrativeReviewReport(BaseModel):
    ok: bool = Field(
        description="True when no critical issues and story reads coherently for the reviewed window."
    )
    reader_verdict: str = Field(
        description="1-2 sentences: would a reader stay hooked through these chapters?"
    )
    continuity_summary: str = Field(
        description="How well adjacent chapters connect (time, POV, causal links)."
    )
    outline_alignment: str = Field(
        description="Whether plot beats match the novel-scope outline / plan."
    )
    worldview_consistency: str = Field(
        description="Setting rules, power system, geography, tone vs world memory."
    )
    foreshadow_ledger: str = Field(
        description="Planted hooks vs payoffs; open threads that need follow-up."
    )
    engagement_notes: str = Field(
        description="Pacing, conflict density, clarity, emotional pull."
    )
    findings: list[ReviewFinding] = Field(default_factory=list)


def _normalize_para(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def find_duplicate_paragraphs(
    chapters: list[tuple[str, str, str]],
) -> list[dict[str, Any]]:
    """Exact paragraph reuse across chapters (deterministic pre-check)."""
    hits: list[dict[str, Any]] = []
    index: dict[str, list[tuple[str, str]]] = {}
    for cid, title, body in chapters:
        for para in re.split(r"\n\s*\n", body or ""):
            norm = _normalize_para(para)
            if len(norm) < _MIN_PARA_DUP_LEN:
                continue
            index.setdefault(norm, []).append((cid, title))
    for norm, refs in index.items():
        if len(refs) < 2:
            continue
        unique_ids = list(dict.fromkeys(r[0] for r in refs))
        if len(unique_ids) < 2:
            continue
        hits.append(
            {
                "chapter_ids": unique_ids,
                "titles": [r[1] for r in refs[:4]],
                "excerpt": norm[:160] + ("…" if len(norm) > 160 else ""),
            }
        )
    return hits[:12]


def _scope_bucket(tree: dict[str, Any], scope: str) -> dict[str, Any]:
    if scope == "character":
        raw = tree.get("characters")
    elif scope == "chapter":
        raw = tree.get("chapters")
    else:
        raw = tree.get(scope)
    return raw if isinstance(raw, dict) else {}


def _load_scope_text(
    ctx: AgentRunContext,
    scope: str,
    *,
    max_chars: int,
) -> str:
    tree = load_story_memory_tree(ctx)
    bucket = _scope_bucket(tree, scope)
    if not bucket:
        return ""
    parts: list[str] = []
    for key in sorted(bucket.keys(), key=str)[:24]:
        text, err = _read_memory_json_impl(ctx, scope, str(key))
        if err or not text:
            continue
        parts.append(f"## {key}\n{text.strip()[:1600]}")
    return "\n\n".join(parts)[:max_chars]


def _chapter_memory_excerpt(ctx: AgentRunContext, chapter_id: str) -> str:
    text, err = _read_memory_json_impl(
        ctx, "chapter", chapter_id, item_id=chapter_id
    )
    if err or not text:
        return ""
    return text.strip()[:_MEMORY_MAX]


def _written_chapter_ids(rows: list[dict[str, Any]]) -> list[str]:
    ordered = sorted_chapter_summaries([dict(r) for r in rows if isinstance(r, dict)])
    return [
        chapter_row_id(r)
        for r in ordered
        if chapter_row_id(r) and int(r.get("word_count") or 0) >= 100
    ]


def _pick_review_chapter_ids(
    rows: list[dict[str, Any]],
    inp: NarrativeReviewInput,
) -> tuple[list[str], list[str]]:
    """Return (deep_read_ids, semantic_scan_ids)."""
    ordered = sorted_chapter_summaries([dict(r) for r in rows if isinstance(r, dict)])
    written = _written_chapter_ids(rows)
    limit = min(inp.max_chapters, 12)

    if inp.chapter_ids:
        deep = [cid for cid in inp.chapter_ids if cid in set(written)][:limit]
        return deep, written

    focus = [str(c).strip() for c in (inp.focus_chapter_ids or []) if str(c).strip()]
    focus = [c for c in focus if c in set(written)]

    scope = inp.scope
    if isinstance(scope, str):
        scope = NarrativeReviewScope(scope)

    if scope == NarrativeReviewScope.full_book:
        deep = focus[:limit] if focus else written[-limit:]
        return deep, written

    if scope == NarrativeReviewScope.changed:
        deep = focus[:limit] if focus else written[-limit:]
        return deep, written

    return written[-limit:], written[-limit:]


async def _load_chapter_body(ctx: AgentRunContext, chapter_id: str) -> str:
    full = await chapter_client.fetch_chapter_full(ctx, chapter_id)
    if not full:
        return ""
    return str(full.get("content") or "").strip()


def _slice_excerpt(body: str, *, head: int, tail: int) -> dict[str, str]:
    text = body or ""
    if len(text) <= head + tail + 80:
        return {"full": text}
    mid_start = max(head, (len(text) - _REVIEW_BODY_MID_CHARS) // 2)
    mid = text[mid_start : mid_start + 400]
    return {
        "opening": text[:head],
        "middle_hint": mid,
        "closing": text[-tail:] if tail else "",
    }


async def build_narrative_review_bundle(
    ctx: AgentRunContext,
    inp: NarrativeReviewInput,
) -> dict[str, Any]:
    rows = await chapter_client.fetch_chapter_summaries(ctx)
    deep_ids, scan_ids = _pick_review_chapter_ids(rows, inp)
    ordered = sorted_chapter_summaries([dict(r) for r in rows if isinstance(r, dict)])
    id_to_row = {chapter_row_id(r): r for r in ordered if chapter_row_id(r)}

    chapter_slices: list[tuple[str, str, str]] = []
    window_blocks: list[dict[str, Any]] = []

    for cid in deep_ids:
        row = id_to_row.get(cid) or {}
        title = str(row.get("title") or "未命名")
        body = await _load_chapter_body(ctx, cid)
        chapter_slices.append((cid, title, body))
        idx = int(row.get("list_index") or 0)
        mem = _chapter_memory_excerpt(ctx, cid)
        pos = ordered.index(row) if row in ordered else -1
        prev_tail = ""
        next_head = ""
        if pos > 0:
            prev_id = chapter_row_id(ordered[pos - 1])
            prev_body = await _load_chapter_body(ctx, prev_id)
            prev_tail = prev_body[-_REVIEW_TAIL_CHARS:] if prev_body else ""
        if 0 <= pos < len(ordered) - 1:
            next_id = chapter_row_id(ordered[pos + 1])
            next_body = await _load_chapter_body(ctx, next_id)
            next_head = next_body[:_REVIEW_HEAD_CHARS] if next_body else ""
        window_blocks.append(
            {
                "chapter_id": cid,
                "index": idx,
                "title": title,
                "word_count": int(row.get("word_count") or 0),
                "memory_excerpt": mem,
                "body_excerpt": _slice_excerpt(
                    body, head=_REVIEW_HEAD_CHARS, tail=_REVIEW_TAIL_CHARS
                ),
                "prev_chapter_closing": prev_tail,
                "next_chapter_opening": next_head,
            }
        )

    literal_dupes: list[dict[str, Any]] = []
    semantic_dupes: list[dict[str, Any]] = []
    if inp.check_duplication:
        scan_slices: list[tuple[str, str, str]] = []
        for cid in scan_ids:
            row = id_to_row.get(cid) or {}
            title = str(row.get("title") or "未命名")
            body = await _load_chapter_body(ctx, cid)
            scan_slices.append((cid, title, body))
        literal_dupes = find_duplicate_paragraphs(scan_slices)
        semantic_dupes = await find_semantic_duplicates(
            scan_slices,
            threshold=float(inp.semantic_threshold),
        )

    foreshadow_lines: list[str] = []
    for cid in scan_ids[:40]:
        mem = _chapter_memory_excerpt(ctx, cid)
        if not mem:
            continue
        row = id_to_row.get(cid) or {}
        idx = int(row.get("list_index") or 0)
        title = str(row.get("title") or "")
        foreshadow_lines.append(f"- index={idx} [{cid}] {title}: {mem[:400]}")

    return {
        "scope": inp.scope.value if hasattr(inp.scope, "value") else str(inp.scope),
        "deep_read_chapter_ids": deep_ids,
        "semantic_scan_chapter_ids": scan_ids,
        "book_chapter_count": len(_written_chapter_ids(rows)),
        "outline_text": _load_scope_text(ctx, "novel", max_chars=_OUTLINE_MAX)
        if inp.check_outline
        else "",
        "worldview_text": _load_scope_text(ctx, "world", max_chars=_WORLD_MAX)
        if inp.check_worldview
        else "",
        "background_text": _load_scope_text(ctx, "background", max_chars=2000),
        "duplicate_paragraphs": literal_dupes,
        "semantic_duplicates": semantic_dupes,
        "foreshadow_memory_digest": "\n".join(foreshadow_lines)[:8000],
        "chapters": window_blocks,
        "checks_enabled": {
            "continuity": inp.check_continuity,
            "outline": inp.check_outline,
            "worldview": inp.check_worldview,
            "foreshadow": inp.check_foreshadow,
            "duplicate": inp.check_duplication,
            "engagement": inp.check_engagement,
        },
    }


def _review_system_prompt() -> str:
    return (
        "你是番茄/起点风格的资深网文责编，只做**审查报告**，不改正文。\n"
        "依据：大纲（novel 记忆）、世界观（world 记忆）、章节正文节选、章节记忆（摘要/伏笔）。\n"
        "维度：\n"
        "- continuity：上下章时间线、因果、人物状态、场景切换是否顺滑\n"
        "- outline：是否偏离大纲/规划中的阶段目标\n"
        "- worldview：力量体系、地理、势力、禁忌是否与设定矛盾\n"
        "- foreshadow：伏笔是否遗漏、过早回收、或悬空无交代\n"
        "- duplicate：字面重复段落 + semantic_duplicates 向量相似（洗稿/复述）\n"
        "- engagement：节奏、冲突、钩子、读者是否想继续读\n"
        "severity：critical=必须修；warning=建议修；info=可选优化。\n"
        "ok=true 仅当无 critical 且 continuity/outline 无重大偏离。\n"
        "输出必须符合 NarrativeReviewReport schema。"
    )


def _review_human_payload(bundle: dict[str, Any]) -> str:
    return json.dumps(bundle, ensure_ascii=False)[:28000]


async def run_narrative_review_llm(bundle: dict[str, Any]) -> NarrativeReviewReport | None:
    if not llm_provider.is_configured:
        return None
    try:
        return await invoke_structured_with_retry(
            [
                SystemMessage(content=_review_system_prompt()),
                HumanMessage(content=_review_human_payload(bundle)),
            ],
            NarrativeReviewReport,
            profile="fast",
        )
    except Exception:
        logger.exception("narrative review LLM failed")
        return None


def _heuristic_report(bundle: dict[str, Any]) -> NarrativeReviewReport:
    findings: list[ReviewFinding] = []
    for item in bundle.get("duplicate_paragraphs") or []:
        if not isinstance(item, dict):
            continue
        ids = item.get("chapter_ids") or []
        findings.append(
            ReviewFinding(
                severity="warning",
                dimension="duplicate",
                chapter_id=str(ids[0]) if ids else None,
                title="正文段落重复",
                detail=str(item.get("excerpt") or ""),
                fix_hint="删改重复段落或改为回顾式简述。",
            )
        )
    for item in bundle.get("semantic_duplicates") or []:
        if not isinstance(item, dict):
            continue
        ids = item.get("chapter_ids") or []
        sim = item.get("similarity")
        findings.append(
            ReviewFinding(
                severity="warning",
                dimension="duplicate",
                chapter_id=str(ids[0]) if ids else None,
                title=f"语义重复（相似度 {sim}）",
                detail=f"A: {item.get('excerpt_a', '')} | B: {item.get('excerpt_b', '')}",
                fix_hint="改写复述段或删除重复剧情。",
            )
        )
    if not bundle.get("outline_text") and bundle.get("checks_enabled", {}).get("outline"):
        findings.append(
            ReviewFinding(
                severity="info",
                dimension="outline",
                title="缺少大纲记忆",
                detail="novel scope 无 ReadMemory 可读正文，无法核对是否偏离大纲。",
                fix_hint="WriteMemory(scope=novel) 写入分章规划后再审查。",
            )
        )
    critical = any(f.severity == "critical" for f in findings)
    has_dup = bool(bundle.get("duplicate_paragraphs") or bundle.get("semantic_duplicates"))
    return NarrativeReviewReport(
        ok=not critical and not has_dup,
        reader_verdict="仅完成规则预检（LLM 未启用或调用失败）。",
        continuity_summary="需 LLM 或人工通读上下章衔接。",
        outline_alignment="见 findings。",
        worldview_consistency="需对照 world 记忆与正文。",
        foreshadow_ledger="请 ReadMemory chapter 条目的「伏笔」字段。",
        engagement_notes="—",
        findings=findings,
    )


async def execute_narrative_review(
    ctx: AgentRunContext,
    inp: NarrativeReviewInput,
) -> tuple[NarrativeReviewReport, dict[str, Any]]:
    bundle = await build_narrative_review_bundle(ctx, inp)
    if not bundle.get("deep_read_chapter_ids") and not bundle.get("semantic_scan_chapter_ids"):
        report = NarrativeReviewReport(
            ok=True,
            reader_verdict="无足够章节正文可审查（需 word_count≥100）。",
            continuity_summary="—",
            outline_alignment="—",
            worldview_consistency="—",
            foreshadow_ledger="—",
            engagement_notes="—",
            findings=[],
        )
        return report, bundle

    report = await run_narrative_review_llm(bundle)
    if report is None:
        report = _heuristic_report(bundle)
    elif bundle.get("duplicate_paragraphs") or bundle.get("semantic_duplicates"):
        known = {(f.dimension, f.detail[:80]) for f in report.findings}
        for key in ("duplicate_paragraphs", "semantic_duplicates"):
            for item in bundle.get(key) or []:
                if not isinstance(item, dict):
                    continue
                ex = str(item.get("excerpt") or item.get("excerpt_a") or "")[:80]
                if ("duplicate", ex) in known:
                    continue
                ids = item.get("chapter_ids") or []
                title = "语义重复" if key == "semantic_duplicates" else "正文段落重复"
                detail = ex or str(item.get("similarity") or "")
                report.findings.append(
                    ReviewFinding(
                        severity="warning",
                        dimension="duplicate",
                        chapter_id=str(ids[0]) if ids else None,
                        title=title,
                        detail=detail,
                        fix_hint="删改或合并重复内容。",
                    )
                )
        if any(f.severity == "critical" for f in report.findings):
            report.ok = False
    return report, bundle


def format_narrative_review_message(report: NarrativeReviewReport) -> str:
    if report.ok and not report.findings:
        return ""
    lines = [
        "【系统】叙事审查（连贯性 / 大纲 / 世界观 / 伏笔 / 可读性）：",
        f"读者向结论：{report.reader_verdict}",
    ]
    if report.continuity_summary.strip():
        lines.append(f"衔接：{report.continuity_summary[:400]}")
    if report.outline_alignment.strip():
        lines.append(f"大纲：{report.outline_alignment[:400]}")
    if report.worldview_consistency.strip():
        lines.append(f"世界观：{report.worldview_consistency[:400]}")
    if report.foreshadow_ledger.strip():
        lines.append(f"伏笔：{report.foreshadow_ledger[:400]}")
    crit = [f for f in report.findings if f.severity == "critical"]
    warn = [f for f in report.findings if f.severity == "warning"]
    for bucket, label in ((crit, "必须修"), (warn, "建议修")):
        for f in bucket[:5]:
            cid = f" [{f.chapter_id}]" if f.chapter_id else ""
            lines.append(f"- [{label}/{f.dimension}]{cid} {f.title}：{f.detail[:200]}")
            if f.fix_hint:
                lines.append(f"  → {f.fix_hint[:160]}")
    lines.append("可调用 NarrativeReview 查看完整 JSON，或 EditChapter / WriteMemory 修正。")
    return "\n".join(lines)


async def narrative_review(ctx: AgentRunContext, inp: NarrativeReviewInput) -> ToolCallResult:
    report, bundle = await execute_narrative_review(ctx, inp)
    payload = report.model_dump()
    patch: dict[str, Any] = {
        "last_narrative_review": payload,
        "narrative_review_chapter_ids": bundle.get("deep_read_chapter_ids"),
    }
    return ToolCallResult(
        content=json.dumps(payload, ensure_ascii=False),
        context_patch=patch,
    )


NARRATIVE_REVIEW_TOOL = build_tool(
    name="NarrativeReview",
    description=(
        "Narrative QA: scope=full_book scans ALL chapters for semantic/literal duplicates; "
        "deep-reads focus chapters for continuity, outline (novel memory), worldview (world), "
        "foreshadow (chapter memory), and reader engagement. Read-only structured report."
    ),
    input_model=NarrativeReviewInput,
    call=narrative_review,
    is_concurrency_safe=lambda _i: True,
    is_read_only=lambda _i: True,
)
