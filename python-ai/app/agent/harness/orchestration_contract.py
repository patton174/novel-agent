"""CC tool orchestration contract (minimal batch rules)."""

from __future__ import annotations

from dataclasses import dataclass

from app.agent.schemas import AgentRunContext, PlanToolCall
from app.agent.tools.registry import (
    find_tool_by_name,
    get_tool_names,
)

PLAN_MAX_TOOL_CALLS = 8

INTERACTION_TOOLS = frozenset({"AskUser"})
QUERY_LOOP_INTERACTION_TOOLS = INTERACTION_TOOLS
QUERY_LOOP_TERMINAL_TOOLS = frozenset({"AskUser"})
QUERY_LOOP_END_RUN_TOOLS: frozenset[str] = frozenset()

def get_main_loop_tools(ctx: AgentRunContext | None = None) -> frozenset[str]:
    return get_tool_names(ctx)


MAIN_LOOP_TOOLS: frozenset[str] = get_tool_names()


@dataclass(frozen=True)
class PlanInvariantViolation:
    code: str
    message: str


class PlanInvariantError(Exception):
    def __init__(self, violations: list[PlanInvariantViolation]) -> None:
        self.violations = violations
        super().__init__("; ".join(v.message for v in violations[:5]))


BLOCKING_BATCH_VIOLATION_CODES = frozenset({"unknown_tool", "max_calls"})
BLOCKING_RAW_PLAN_VIOLATION_CODES = frozenset({"max_calls"})


def normalize_tool_calls(
    tool_calls: list[PlanToolCall] | None,
    *,
    next_tool: str = "",
    next_input: dict | None = None,
) -> list[PlanToolCall]:
    calls = list(tool_calls or [])
    if not calls and (next_tool or "").strip():
        calls = [PlanToolCall(tool=str(next_tool).strip(), input=dict(next_input or {}))]
    out: list[PlanToolCall] = []
    for call in calls[:PLAN_MAX_TOOL_CALLS]:
        tool = (call.tool or "").strip()
        if not tool:
            continue
        inp = call.input if isinstance(call.input, dict) else {}
        out.append(PlanToolCall(tool=tool, input=dict(inp)))
    return out


def validate_plan_batch(
    calls: list[PlanToolCall],
    *,
    continue_plan: bool | None = None,
    resolved: bool = True,
    ctx: AgentRunContext | None = None,
) -> list[PlanInvariantViolation]:
    _ = continue_plan, resolved
    violations: list[PlanInvariantViolation] = []
    if len(calls) > PLAN_MAX_TOOL_CALLS:
        violations.append(
            PlanInvariantViolation("max_calls", f"max {PLAN_MAX_TOOL_CALLS} tools per turn")
        )
    allowed = get_tool_names(ctx)
    for call in calls:
        tool = call.tool or ""
        if tool not in allowed:
            violations.append(
                PlanInvariantViolation("unknown_tool", f"No such tool available: {tool}")
            )
    asks = [c for c in calls if (c.tool or "") in INTERACTION_TOOLS]
    if len(asks) > 1:
        violations.append(
            PlanInvariantViolation("multiple_ask", "only one AskUser per batch")
        )
    return violations


def blocking_batch_violations(
    calls: list[PlanToolCall],
    *,
    continue_plan: bool | None = None,
    ctx: AgentRunContext | None = None,
) -> list[PlanInvariantViolation]:
    return [
        v
        for v in validate_plan_batch(calls, continue_plan=continue_plan, ctx=ctx)
        if v.code in BLOCKING_BATCH_VIOLATION_CODES
    ]


blocking_resolved_plan_violations = blocking_batch_violations


def blocking_raw_plan_violations(calls: list[PlanToolCall]) -> list[PlanInvariantViolation]:
    out: list[PlanInvariantViolation] = []
    if len(calls) > PLAN_MAX_TOOL_CALLS:
        out.append(PlanInvariantViolation("max_calls", "too many tools"))
    return out


def reorder_plan_tool_calls(calls: list[PlanToolCall]) -> list[PlanToolCall]:
    """AskUser last; preserve relative order otherwise."""
    normal: list[PlanToolCall] = []
    asks: list[PlanToolCall] = []
    for c in calls:
        if (c.tool or "") in INTERACTION_TOOLS:
            asks.append(c)
        else:
            normal.append(c)
    return normal + asks[:1]


def pick_terminal_tool_call(terminals: list[PlanToolCall]) -> PlanToolCall | None:
    return terminals[0] if terminals else None


def plan_has_memory_batch(calls: list[PlanToolCall]) -> bool:
    return any(
        (c.tool or "") in ("ReadMemory", "ListMemory", "SearchKnowledge") for c in calls
    )


def plan_has_terminal_reply(calls: list[PlanToolCall]) -> bool:
    return any((c.tool or "") in QUERY_LOOP_TERMINAL_TOOLS for c in calls)


def is_tool_concurrency_safe(tool: str, inp: dict | None = None) -> bool:
    from app.agent.tools.registry import partition_concurrency_safe

    raw = dict(inp or {})
    if partition_concurrency_safe(tool, raw):
        return True
    t = find_tool_by_name(tool)
    if t is None:
        return False
    if t.name in (
        "ListChapters",
        "ReadChapter",
        "ListMemory",
        "ReadMemory",
        "SearchKnowledge",
        "WebFetch",
        "WebSearch",
    ):
        return True
    return False


def build_main_loop_system_prompt() -> str:
    from app.agent.harness.visible_text_channel import visible_text_channel_prompt_block
    from app.agent.tools.registry import get_all_tools

    names = ", ".join(sorted(t.name for t in get_all_tools()))
    channel_block = visible_text_channel_prompt_block()
    return f"""You are a novel-writing agent with structured API tools (not file paths).

{channel_block}

Data lives in **Content API (PostgreSQL)** and **story-memory API** — never construct VFS paths.
Use RUN_CONTEXT `chapter_catalog` / `memory_catalog` for IDs when present.

Available tools: {names}

Workflow:
- **Chapters**: `ListChapters` → `chapter_id` + index; `ReadChapter` / `WriteChapter` / `EditChapter` / `DeleteChapter` / `ReorderChapters` / `ChapterAudit` / `NarrativeReview`
- **WriteChapter**: pure title (no 第N章 prefix); `position` or `after_chapter_id` controls order (append by default); empty `content` streams body
- **ChapterAudit**: catalog hygiene — duplicate titles, empty chapters, title prefixes
- **NarrativeReview**: `scope=full_book` for whole-book semantic duplicate scan + deep-read focus chapters; uses novel/world/chapter memory
- **Auto review agent**: after WriteChapter/EditChapter/Agent batch, a read-only review sub-agent runs NarrativeReview + ChapterAudit
- **ReorderChapters**: full `chapter_ids` or partial `moves`
- **DeleteChapter**: single id, batch ids, or `dedupe_title`
- **Memory**: `ListMemory` → `ReadMemory(scope, key)` / `WriteMemory` / `EditMemory` / `DeleteMemory`
- **Search**: `SearchKnowledge(query)`; `GetCharacterGraph(character)` when KG enabled
- **TodoWrite**: id + content + status; mark in_progress before work, completed immediately after; merge=true with full list
- **Agent**: delegate focused slices (≤4 chapters per call when batching)
- **WebSearch/WebFetch/Skill/MCP**: when configured

Never use removed tools (Read, Write, Edit, Glob, Grep, chapter_read, memory_read, ToolSearch, etc.)."""


def context_decision_hints() -> dict[str, str]:
    return {
        "catalog": (
            "Use novel.chapter_catalog and memory.memory_catalog in RUN_CONTEXT for IDs. "
            "Chapter tools accept index/position and can auto-merge reorder payloads."
        ),
    }


def plan_input_policy_summary_for_prompt() -> str:
    return "Tool inputs must match each tool's schema. Missing fields return tool_use_error."
