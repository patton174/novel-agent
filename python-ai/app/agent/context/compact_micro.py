"""Microcompact old tool results in LangChain messages (CC time-based MC content-clear path)."""

from __future__ import annotations

from dataclasses import dataclass, field

from langchain_core.messages import AIMessage, BaseMessage, ToolMessage

from app.agent.context.usage import estimate_text_tokens
from app.agent.harness.message_history import _tool_call_id_and_name

# CC: TIME_BASED_MC_CLEARED_MESSAGE / toolResultStorage.ts
MICROCOMPACT_CLEARED_MESSAGE = "[Old tool result content cleared]"

# CC microCompact.ts COMPACTABLE_TOOLS — novel-agent read/search tools (lazy-load bodies)
COMPACTABLE_TOOLS = frozenset(
    {
        "ReadChapter",
        "ListChapters",
        "ReadMemory",
        "GetMemoryTree",
        "ListMemory",
        "SearchKnowledge",
        "SearchSessionHistory",
        "GetCharacterGraph",
        "WebFetch",
        "WebSearch",
        "NarrativeReview",
        "ChapterAudit",
    }
)


@dataclass
class MicrocompactResult:
    cleared_count: int = 0
    tokens_saved: int = 0
    compacted_tool_ids: list[str] = field(default_factory=list)
    kept_recent: int = 0

    @property
    def changed(self) -> bool:
        return self.cleared_count > 0


def _tool_message_tokens(msg: ToolMessage) -> int:
    content = msg.content
    if isinstance(content, str):
        return estimate_text_tokens(content)
    return estimate_text_tokens(str(content or ""))


def collect_compactable_tool_ids(messages: list[BaseMessage]) -> list[str]:
    """Tool call ids for compactable tools, in encounter order (CC collectCompactableToolIds)."""
    ids: list[str] = []
    for msg in messages:
        if not isinstance(msg, AIMessage):
            continue
        for tc in msg.tool_calls or []:
            tid, name = _tool_call_id_and_name(tc)
            if tid and name in COMPACTABLE_TOOLS:
                ids.append(tid)
    return ids


def microcompact_messages(
    messages: list[BaseMessage],
    *,
    keep_recent: int | None = None,
    force: bool = False,
) -> MicrocompactResult:
    """
    Replace bodies of old compactable ToolMessages with MICROCOMPACT_CLEARED_MESSAGE.

    CC count-based / time-based MC: clear when compactable count exceeds trigger,
    keep the last ``keep_recent`` bodies. Mutates ``messages`` in place.
    """
    from app.agent.context.policy import microcompact_keep_recent, should_microcompact_messages

    keep = max(1, keep_recent if keep_recent is not None else microcompact_keep_recent())
    compactable_ids = collect_compactable_tool_ids(messages)
    if not force and not should_microcompact_messages(messages):
        return MicrocompactResult(kept_recent=keep)
    if len(compactable_ids) <= keep:
        return MicrocompactResult(kept_recent=keep)

    keep_set = set(compactable_ids[-keep:])
    clear_set = {tid for tid in compactable_ids if tid not in keep_set}
    if not clear_set:
        return MicrocompactResult(kept_recent=keep)

    cleared: list[str] = []
    tokens_saved = 0

    for i, msg in enumerate(messages):
        if not isinstance(msg, ToolMessage):
            continue
        tid = str(msg.tool_call_id or "").strip()
        if not tid or tid not in clear_set:
            continue
        body = msg.content if isinstance(msg.content, str) else str(msg.content or "")
        if not body.strip() or body.strip() == MICROCOMPACT_CLEARED_MESSAGE:
            continue
        tokens_saved += _tool_message_tokens(msg)
        messages[i] = ToolMessage(
            content=MICROCOMPACT_CLEARED_MESSAGE,
            tool_call_id=tid,
            name=getattr(msg, "name", None),
            status=getattr(msg, "status", None),
        )
        cleared.append(tid)

    return MicrocompactResult(
        cleared_count=len(cleared),
        tokens_saved=tokens_saved,
        compacted_tool_ids=cleared,
        kept_recent=keep,
    )


def maybe_time_based_microcompact(
    messages: list[BaseMessage],
    *,
    idle_minutes: float,
) -> MicrocompactResult | None:
    """
    CC ``maybeTimeBasedMicrocompact`` — only when enabled and idle gap exceeded.
    Returns None when trigger does not fire.
    """
    from app.agent.context.policy import (
        microcompact_idle_minutes,
        microcompact_keep_recent,
        microcompact_time_based_enabled,
    )

    if not microcompact_time_based_enabled():
        return None
    threshold = microcompact_idle_minutes()
    if not idle_minutes or idle_minutes < threshold:
        return None
    result = microcompact_messages(
        messages,
        keep_recent=microcompact_keep_recent(),
        force=True,
    )
    return result if result.changed else None
