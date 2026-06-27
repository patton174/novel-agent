"""Per-turn tool result budget (CC ``applyToolResultBudget``, API-adapted).

CC persists overflow to local disk and re-applies cached previews each turn.
We keep the same *decision freeze* semantics but inline preview replacements
(no filesystem — stateless API workers).
"""

from __future__ import annotations

from dataclasses import dataclass, field

from langchain_core.messages import AIMessage, BaseMessage, ToolMessage

from app.agent.context.policy import tool_result_budget_limit_chars
from app.agent.harness.message_history import _tool_call_id_and_name

PERSISTED_OUTPUT_OPEN = "<persisted-output>"
PERSISTED_OUTPUT_CLOSE = "</persisted-output>"
_PREVIEW_CHARS = 2000

# CC Read tool uses maxResultSizeChars=Infinity — never budget-replaced.
_SKIP_BUDGET_TOOLS = frozenset({"ReadChapter", "ReadMemory"})


@dataclass
class ToolResultCandidate:
    tool_call_id: str
    tool_name: str
    size: int
    message_index: int


@dataclass
class ContentReplacementState:
    seen_ids: set[str] = field(default_factory=set)
    replacements: dict[str, str] = field(default_factory=dict)


@dataclass
class ToolResultBudgetResult:
    replaced_count: int = 0
    reapplied_count: int = 0
    chars_shed: int = 0

    @property
    def changed(self) -> bool:
        return self.replaced_count > 0


def build_preview_replacement(body: str, *, original_size: int) -> str:
    preview = (body or "")[:_PREVIEW_CHARS]
    if len(body) > _PREVIEW_CHARS:
        preview += "\n..."
    return (
        f"{PERSISTED_OUTPUT_OPEN}\n"
        f"Output too large ({original_size} chars). "
        "Full output is not kept in the API session context.\n\n"
        f"Preview (first {_PREVIEW_CHARS} chars):\n"
        f"{preview}\n"
        f"{PERSISTED_OUTPUT_CLOSE}"
    )


def _tool_rounds(messages: list[BaseMessage]) -> list[list[ToolResultCandidate]]:
    """Group ToolMessages by preceding AIMessage tool_use round (CC user-message group)."""
    rounds: list[list[ToolResultCandidate]] = []
    current: list[ToolResultCandidate] = []
    pending_names: dict[str, str] = {}

    for i, msg in enumerate(messages):
        if isinstance(msg, AIMessage):
            if current:
                rounds.append(current)
                current = []
            pending_names = {}
            for tc in msg.tool_calls or []:
                tid, name = _tool_call_id_and_name(tc)
                if tid:
                    pending_names[tid] = name or "tool"
            continue
        if isinstance(msg, ToolMessage):
            tid = str(msg.tool_call_id or "").strip()
            if not tid:
                continue
            body = msg.content if isinstance(msg.content, str) else str(msg.content or "")
            name = str(getattr(msg, "name", None) or pending_names.get(tid) or "tool")
            current.append(
                ToolResultCandidate(
                    tool_call_id=tid,
                    tool_name=name,
                    size=len(body),
                    message_index=i,
                )
            )
            continue
        if current:
            rounds.append(current)
            current = []
            pending_names = {}

    if current:
        rounds.append(current)
    return rounds


def provision_content_replacement_state(
    messages: list[BaseMessage] | None,
) -> ContentReplacementState:
    """Freeze hydrated tool results — CC ``reconstructContentReplacementState``."""
    state = ContentReplacementState()
    if not messages:
        return state
    for rnd in _tool_rounds(messages):
        for c in rnd:
            state.seen_ids.add(c.tool_call_id)
    return state


def enforce_tool_result_budget(
    messages: list[BaseMessage],
    state: ContentReplacementState,
) -> ToolResultBudgetResult:
    """
    Per-round aggregate budget. Mutates ``messages`` in place for fresh replacements;
    re-applies cached replacements for prior decisions (CC ``enforceToolResultBudget``).
    """
    limit = tool_result_budget_limit_chars()
    result = ToolResultBudgetResult()
    replacement_map: dict[str, str] = {}

    for rnd in _tool_rounds(messages):
        must_reapply: list[ToolResultCandidate] = []
        frozen: list[ToolResultCandidate] = []
        fresh: list[ToolResultCandidate] = []

        for c in rnd:
            if c.tool_call_id in state.replacements:
                must_reapply.append(c)
            elif c.tool_call_id in state.seen_ids:
                frozen.append(c)
            else:
                fresh.append(c)

        for c in must_reapply:
            replacement_map[c.tool_call_id] = state.replacements[c.tool_call_id]
            result.reapplied_count += 1

        skipped = {c.tool_call_id for c in fresh if c.tool_name in _SKIP_BUDGET_TOOLS}
        for tid in skipped:
            state.seen_ids.add(tid)
        eligible = [c for c in fresh if c.tool_call_id not in skipped]

        frozen_size = sum(c.size for c in frozen)
        fresh_size = sum(c.size for c in eligible)
        selected: list[ToolResultCandidate] = []
        if frozen_size + fresh_size > limit:
            sorted_fresh = sorted(eligible, key=lambda c: c.size, reverse=True)
            remaining = frozen_size + fresh_size
            for c in sorted_fresh:
                if remaining <= limit:
                    break
                selected.append(c)
                remaining -= c.size

        selected_ids = {c.tool_call_id for c in selected}
        for c in rnd:
            if c.tool_call_id not in selected_ids:
                state.seen_ids.add(c.tool_call_id)

        for c in selected:
            idx = c.message_index
            msg = messages[idx]
            if not isinstance(msg, ToolMessage):
                continue
            body = msg.content if isinstance(msg.content, str) else str(msg.content or "")
            preview = build_preview_replacement(body, original_size=len(body))
            replacement_map[c.tool_call_id] = preview
            state.replacements[c.tool_call_id] = preview
            state.seen_ids.add(c.tool_call_id)
            result.replaced_count += 1
            result.chars_shed += max(0, len(body) - len(preview))

    if not replacement_map:
        return result

    for tid, content in replacement_map.items():
        for i, msg in enumerate(messages):
            if not isinstance(msg, ToolMessage):
                continue
            if str(msg.tool_call_id or "").strip() != tid:
                continue
            messages[i] = ToolMessage(
                content=content,
                tool_call_id=tid,
                name=getattr(msg, "name", None),
                status=getattr(msg, "status", None),
            )
            break

    return result
