"""CC tool orchestration contract (minimal batch rules)."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from app.agent.schemas import AgentRunContext, PlanToolCall
from app.agent.tools.registry import (
    find_tool_by_name,
    get_tool_names,
)

logger = logging.getLogger(__name__)

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


def reorder_execution_items(items: list) -> list:
    """Run concurrency-safe tools first so they share one parallel batch.

    Model order is preserved via ``call_order`` on each item; ToolMessages are
    still appended in original tool_call order after execution.
    """
    if len(items) <= 1:
        return list(items)
    asks = [i for i in items if (i.tool or "") in INTERACTION_TOOLS]
    rest = [i for i in items if (i.tool or "") not in INTERACTION_TOOLS]
    safe = [i for i in rest if is_tool_concurrency_safe(i.tool, i.input)]
    serial = [i for i in rest if not is_tool_concurrency_safe(i.tool, i.input)]
    reordered = safe + serial + asks[:1]
    if len(reordered) != len(items):
        return list(items)
    if reordered == items:
        return list(items)
    logger.info(
        "reordered tool batch for parallelism: %s -> %s",
        [i.tool for i in items],
        [i.tool for i in reordered],
    )
    return reordered


def pick_terminal_tool_call(terminals: list[PlanToolCall]) -> PlanToolCall | None:
    return terminals[0] if terminals else None


def plan_has_memory_batch(calls: list[PlanToolCall]) -> bool:
    return any(
        (c.tool or "") in ("ReadMemory", "ListMemory", "GetMemoryTree", "SearchKnowledge") for c in calls
    )


def plan_has_terminal_reply(calls: list[PlanToolCall]) -> bool:
    return any((c.tool or "") in QUERY_LOOP_TERMINAL_TOOLS for c in calls)


def is_tool_concurrency_safe(tool: str, inp: dict | None = None) -> bool:
    from app.agent.tools.registry import partition_concurrency_safe
    from app.config import settings

    raw = dict(inp or {})
    if (tool or "").strip() == "Agent":
        return settings.agent_parallel_subagents
    if partition_concurrency_safe(tool, raw):
        return True
    t = find_tool_by_name(tool)
    if t is None:
        return False
    if t.name in (
        "ListChapters",
        "ReadChapter",
        "ListMemory",
        "GetMemoryTree",
        "ReadMemory",
        "SearchKnowledge",
        "WebFetch",
        "WebSearch",
    ):
        return True
    return False


def build_main_loop_system_prompt() -> str:
    from app.agent.backend.memory_style_presets import memory_style_prompt_block
    from app.agent.harness.tool_contract import tool_contract_prompt_block
    from app.agent.harness.visible_text_channel import visible_text_prompt_block
    from app.agent.tools.registry import get_all_tools

    names = ", ".join(sorted(t.name for t in get_all_tools()))
    channel_block = visible_text_prompt_block()
    contract_block = tool_contract_prompt_block()
    return f"""You are a novel-writing agent with structured API tools (not file paths).

{channel_block}

{contract_block}

{memory_style_prompt_block()}

Data lives in **Content API (PostgreSQL)** and **memory_node API** — never construct VFS paths.
Use RUN_CONTEXT `chapter_catalog` / `memory_index` for IDs when present.

Available tools: {names}"""


def context_decision_hints() -> dict[str, str]:
    from app.agent.harness.tool_contract import (
        CHAPTER_ID_FIELD,
        CHAPTER_INDEX_FIELD,
        MEMORY_ID_FIELD,
        MEMORY_NODE_TYPE_FIELD,
        MEMORY_PARENT_ID_FIELD,
        MEMORY_SCOPE_FIELD,
    )

    return {
        "catalog": (
            f"Use novel.chapter_catalog for `{CHAPTER_ID_FIELD}` / `{CHAPTER_INDEX_FIELD}`. "
            "Chapter tools accept index or chapter_id; ListChapters returns the same field names."
        ),
        "memory": (
            f"Use memory.memory_index for `{MEMORY_ID_FIELD}` per node (each line shows `[{MEMORY_ID_FIELD}=…]`). "
            f"CreateMemory: `{MEMORY_NODE_TYPE_FIELD}=root` (scope tab, once; short intro only) or "
            f"`{MEMORY_NODE_TYPE_FIELD}=child` (content blocks under the tab — **prefer several children** "
            f"by topic instead of one long root/update). "
            f"Child: `{MEMORY_PARENT_ID_FIELD}` (scope root UUID from memory.scope_root_ids) required. "
            "UI: left tab = root, sub-menu = children, panel = one child body. ReadMemory(memory_id) for bodies."
        ),
    }


def plan_input_policy_summary_for_prompt() -> str:
    return "Tool inputs must match each tool's schema. Missing fields return tool_use_error."
