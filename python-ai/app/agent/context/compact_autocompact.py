"""Autocompact: LLM conversation summary + compact boundary (CC compactConversation)."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)

from app.agent.context.meter import token_count_with_estimation
from app.agent.harness.llm_trace import extract_cache_usage
from app.agent.harness.message_history import _tool_call_id_and_name
from app.agent.harness.transcript import AgentTranscript
from app.config import settings
from app.core.llm import llm_provider
from app.core.llm_content import extract_llm_text

logger = logging.getLogger(__name__)

_NO_TOOLS_PREAMBLE = (
    "CRITICAL: Respond with TEXT ONLY. Do NOT call any tools.\n"
    "Your entire response must be plain text: optional <analysis> then a <summary> block.\n\n"
)

_COMPACT_PROMPT = """Your task is to create a detailed summary of the conversation so far (novel writing / agent tool use).
Capture user requests, tools used (Read/Write/Edit/Glob/Grep), chapter IDs, errors, and what remains pending.

Sections in <summary>:
1. Primary Request and Intent
2. Key Technical Concepts
3. Files / chapters / memory paths touched
4. Errors and fixes
5. Pending Tasks
6. Current Work (most recent)
7. Optional Next Step

Use the same language as the user (Chinese if the user wrote in Chinese)."""

_ANALYSIS_RE = re.compile(r"<analysis>[\s\S]*?</analysis>", re.IGNORECASE)
_SUMMARY_RE = re.compile(r"<summary>([\s\S]*?)</summary>", re.IGNORECASE)

_DEFAULT_KEEP_TAIL = 12
_DEFAULT_MAX_INPUT_CHARS = 90_000


def autocompact_keep_tail_messages() -> int:
    raw = getattr(settings, "agent_autocompact_keep_tail_messages", None)
    try:
        n = int(raw) if raw is not None else _DEFAULT_KEEP_TAIL
    except (TypeError, ValueError):
        n = _DEFAULT_KEEP_TAIL
    return max(4, min(n, 40))


def autocompact_max_input_chars() -> int:
    raw = getattr(settings, "agent_autocompact_max_input_chars", None)
    try:
        n = int(raw) if raw is not None else _DEFAULT_MAX_INPUT_CHARS
    except (TypeError, ValueError):
        n = _DEFAULT_MAX_INPUT_CHARS
    return max(8_000, min(n, 200_000))


def format_compact_summary(raw: str) -> str:
    """Strip <analysis>, unwrap <summary> (CC formatCompactSummary)."""
    text = (raw or "").strip()
    if not text:
        return ""
    text = _ANALYSIS_RE.sub("", text)
    match = _SUMMARY_RE.search(text)
    if match:
        body = (match.group(1) or "").strip()
        text = _SUMMARY_RE.sub(f"Summary:\n{body}", text)
    text = re.sub(r"\n\n+", "\n\n", text)
    return text.strip()


def compact_user_summary_message(summary: str, *, recent_preserved: bool) -> str:
    formatted = format_compact_summary(summary)
    base = (
        "This session continues from a previous conversation that ran out of context. "
        "The summary below covers the earlier portion.\n\n"
        f"{formatted}"
    )
    if recent_preserved:
        base += "\n\nRecent messages below are preserved verbatim."
    base += (
        "\n\nContinue from where you left off. Do not ask the user to repeat context. "
        "Re-call Read/Glob only if you need exact snippets not in the summary."
    )
    return base


def compact_boundary_line(*, trigger: str, pre_tokens: int) -> str:
    return f"[compact_boundary:{trigger}] pre_tokens={pre_tokens}"


@dataclass
class AutocompactResult:
    changed: bool = False
    pre_tokens: int = 0
    post_tokens: int = 0
    messages_removed: int = 0
    summary_chars: int = 0
    error: str | None = None
    compaction_input_tokens: int = 0
    compaction_output_tokens: int = 0


def _message_line(msg: BaseMessage) -> str:
    role = msg.__class__.__name__.replace("Message", "").lower()
    content = msg.content
    if isinstance(content, list):
        text = " ".join(
            str(b.get("text", b)) if isinstance(b, dict) else str(b) for b in content
        )
    else:
        text = str(content or "")
    extra = ""
    if isinstance(msg, AIMessage) and msg.tool_calls:
        names = []
        for tc in msg.tool_calls:
            _, name = _tool_call_id_and_name(tc)
            names.append(name)
        extra = f" tool_calls={','.join(names)}"
    if isinstance(msg, ToolMessage):
        extra = f" tool_call_id={msg.tool_call_id}"
    clipped = text[:12_000] + ("…" if len(text) > 12_000 else "")
    return f"[{role}{extra}]\n{clipped}"


def serialize_messages_for_compact(messages: list[BaseMessage], *, max_chars: int) -> str:
    lines = [_message_line(m) for m in messages]
    blob = "\n\n---\n\n".join(lines)
    if len(blob) <= max_chars:
        return blob
    return blob[: max_chars - 80] + f"\n\n…(truncated for compact input, total {len(blob)} chars)"


def split_messages_for_autocompact(
    messages: list[BaseMessage],
    *,
    keep_tail: int,
) -> tuple[list[BaseMessage], list[BaseMessage], list[BaseMessage]]:
    """
    head = system + primary RUN_CONTEXT human; body = to summarize; tail = recent turns.
    """
    if len(messages) < 4:
        return list(messages), [], []

    head: list[BaseMessage] = [messages[0]]
    rest_start = 1
    if len(messages) > 1 and isinstance(messages[1], HumanMessage):
        head.append(messages[1])
        rest_start = 2

    rest = messages[rest_start:]
    if len(rest) <= keep_tail:
        return head, [], rest

    slice_start = max(0, len(rest) - keep_tail)
    while slice_start > 0 and isinstance(rest[slice_start], ToolMessage):
        slice_start -= 1
    if slice_start > 0 and isinstance(rest[slice_start - 1], AIMessage):
        tool_calls = getattr(rest[slice_start - 1], "tool_calls", None) or []
        if tool_calls:
            slice_start -= 1
    body = rest[:slice_start]
    tail = rest[slice_start:]
    if not body:
        return head, [], tail
    return head, body, tail


def _apply_compact_to_messages(
    messages: list[BaseMessage],
    *,
    head: list[BaseMessage],
    body: list[BaseMessage],
    tail: list[BaseMessage],
    summary_message: str,
    pre_tokens: int,
    trigger: str,
) -> int:
    boundary = SystemMessage(content=compact_boundary_line(trigger=trigger, pre_tokens=pre_tokens))
    summary = HumanMessage(
        content=summary_message,
        additional_kwargs={"is_compact_summary": True, "compact_trigger": trigger},
    )
    old_len = len(messages)
    messages[:] = head + [boundary, summary] + tail
    return max(0, old_len - len(messages))


async def autocompact_conversation(
    messages: list[BaseMessage],
    transcript: AgentTranscript,
    *,
    trigger: str = "auto",
    run_usage: object | None = None,
    model_config: dict | None = None,
) -> AutocompactResult:
    """
    Summarize middle of message list via LLM; insert compact_boundary + summary user message.
    Mutates ``messages`` and ``transcript`` in place on success.
    """
    pre_tokens = token_count_with_estimation(messages)
    keep_tail = autocompact_keep_tail_messages()
    head, body, tail = split_messages_for_autocompact(messages, keep_tail=keep_tail)
    if len(body) < 2:
        return AutocompactResult(pre_tokens=pre_tokens, post_tokens=pre_tokens)

    serialized = serialize_messages_for_compact(
        body, max_chars=autocompact_max_input_chars()
    )
    prompt = f"{_NO_TOOLS_PREAMBLE}{_COMPACT_PROMPT}\n\n---\n\n{serialized}"

    try:
        llm = (
            llm_provider.get_llm(profile="fast", config=model_config)
            if model_config
            else llm_provider.get_llm(profile="fast")
        )
        response = await llm.ainvoke(
            [
                SystemMessage(content="You produce conversation summaries only."),
                HumanMessage(content=prompt),
            ]
        )
    except Exception as exc:
        logger.warning("autocompact LLM failed: %s", exc)
        return AutocompactResult(
            pre_tokens=pre_tokens,
            post_tokens=pre_tokens,
            error=str(exc),
        )

    raw_summary = extract_llm_text(getattr(response, "content", ""), include_thinking=False)
    formatted = format_compact_summary(raw_summary)
    if not formatted or len(formatted) < 80:
        return AutocompactResult(
            pre_tokens=pre_tokens,
            post_tokens=pre_tokens,
            error="empty_summary",
        )

    usage = extract_cache_usage(response)
    if run_usage is not None and hasattr(run_usage, "add_llm_usage"):
        run_usage.add_llm_usage(usage)

    summary_message = compact_user_summary_message(
        formatted, recent_preserved=bool(tail)
    )
    removed = _apply_compact_to_messages(
        messages,
        head=head,
        body=body,
        tail=tail,
        summary_message=summary_message,
        pre_tokens=pre_tokens,
        trigger=trigger,
    )

    transcript.append_autocompact_summary(formatted[:6000])

    post_tokens = token_count_with_estimation(messages)
    return AutocompactResult(
        changed=True,
        pre_tokens=pre_tokens,
        post_tokens=post_tokens,
        messages_removed=removed,
        summary_chars=len(formatted),
        compaction_input_tokens=int(usage.get("input_tokens") or 0),
        compaction_output_tokens=int(usage.get("output_tokens") or 0),
    )
