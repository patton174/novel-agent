"""Hydrate LangChain messages — CC-style transcript + RUN_CONTEXT snapshot."""

from __future__ import annotations

import logging

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from app.agent.context.prompting.run_context import format_agent_context_block
from app.agent.harness.plan_context import think_text_for_plan
from app.agent.harness.transcript import AgentTranscript
from app.agent.schemas import AgentRunContext, PlanRequest

logger = logging.getLogger(__name__)

_RUN_CONTEXT_FLAG = "run_context_snapshot"

_SYNTHETIC_TOOL_RESULT = (
    "[工具结果未配对写入历史；若仍需要该数据请重新调用此工具。]"
)

_HISTORY_TURN_MAX = 24
_HISTORY_CONTENT_MAX = 2000

_TURN_SUFFIX = (
    "若仍需数据或操作则调用 tool_use；若任务已完成则写完整回复（勿再调用工具）。"
)


def _run_context_human(content: str) -> HumanMessage:
    return HumanMessage(
        content=content,
        additional_kwargs={_RUN_CONTEXT_FLAG: True},
    )


def is_run_context_human(msg: object) -> bool:
    if not isinstance(msg, HumanMessage):
        return False
    kwargs = getattr(msg, "additional_kwargs", None) or {}
    return bool(kwargs.get(_RUN_CONTEXT_FLAG))


def _trim_history_content(text: str, *, limit: int = _HISTORY_CONTENT_MAX) -> str:
    body = str(text or "").strip()
    if len(body) <= limit:
        return body
    return body[: limit - 1] + "…"


def hydrate_session_history_messages(ctx: AgentRunContext) -> list:
    from app.agent.harness.session_trace import hydrate_session_history_messages as _hydrate

    return _hydrate(ctx)


def build_run_context_snapshot(
    ctx: AgentRunContext,
    transcript: AgentTranscript,
) -> str:
    rows = transcript.format_for_plan()
    req = PlanRequest(
        context=ctx,
        think_content=transcript.latest_think_text(),
        think_tool_input={"topic": ctx.user_message},
        transcript=rows,
    )
    block = format_agent_context_block(
        ctx,
        transcript_rows=rows,
        think_content=think_text_for_plan(req),
        profile="full",
        include_dialogue=False,
        include_user_message_in_intent=False,
    )
    return "\n\n".join([block, _TURN_SUFFIX])


def build_current_user_human(ctx: AgentRunContext) -> HumanMessage:
    text = str(ctx.user_message or "").strip()
    return HumanMessage(content=text or "（空消息）")


def build_initial_messages(
    ctx: AgentRunContext,
    transcript: AgentTranscript,
    *,
    system: str,
) -> list:
    """
    CC-aligned layout:
      [system] [RUN_CONTEXT snapshot] [session Human/AI…] [current user]
    """
    from app.core.llm_cache import cached_system_message

    messages: list = [
        cached_system_message(system),
        _run_context_human(build_run_context_snapshot(ctx, transcript)),
    ]
    messages.extend(hydrate_session_history_messages(ctx))
    messages.append(build_current_user_human(ctx))
    return messages


def build_run_context_human(
    ctx: AgentRunContext,
    transcript: AgentTranscript,
) -> str:
    """Legacy combined block (subagents / tests). Main loop uses build_initial_messages."""
    return "\n\n".join(
        [
            build_run_context_snapshot(ctx, transcript),
            f"用户消息：{ctx.user_message}",
        ]
    )


def refresh_run_context_human(
    messages: list,
    ctx: AgentRunContext,
    transcript: AgentTranscript,
) -> None:
    """Refresh only the RUN_CONTEXT snapshot human — not session or current user turns."""
    block = build_run_context_snapshot(ctx, transcript)
    for i, msg in enumerate(messages):
        if is_run_context_human(msg):
            messages[i] = _run_context_human(block)
            return
        if i == 1 and isinstance(msg, HumanMessage):
            messages[i] = _run_context_human(block)
            return
    messages.insert(1, _run_context_human(block))


def filter_ai_message_tool_calls(ai_msg: AIMessage, tool_call_ids: set[str]) -> AIMessage:
    """Keep only tool_use blocks that will receive a ToolMessage in this turn."""
    if not tool_call_ids:
        return AIMessage(
            content=ai_msg.content,
            tool_calls=[],
            additional_kwargs=getattr(ai_msg, "additional_kwargs", None) or {},
            response_metadata=getattr(ai_msg, "response_metadata", None) or {},
            id=getattr(ai_msg, "id", None),
        )
    kept: list = []
    for tc in ai_msg.tool_calls or []:
        tid, _ = _tool_call_id_and_name(tc)
        if tid and tid in tool_call_ids:
            kept.append(tc)
    if len(kept) == len(ai_msg.tool_calls or []):
        return ai_msg
    return AIMessage(
        content=ai_msg.content,
        tool_calls=kept,
        additional_kwargs=getattr(ai_msg, "additional_kwargs", None) or {},
        response_metadata=getattr(ai_msg, "response_metadata", None) or {},
        id=getattr(ai_msg, "id", None),
    )


def seal_tool_results_for_last_assistant(messages: list) -> bool:
    """Append placeholder ToolMessages for the last AIMessage still missing results."""
    last_ai_idx: int | None = None
    for i in range(len(messages) - 1, -1, -1):
        if isinstance(messages[i], AIMessage):
            last_ai_idx = i
            break
    if last_ai_idx is None:
        return False

    ai_msg = messages[last_ai_idx]
    pending: dict[str, str] = {}
    for tc in ai_msg.tool_calls or []:
        tid, name = _tool_call_id_and_name(tc)
        if tid:
            pending[tid] = name

    if not pending:
        return False

    for msg in messages[last_ai_idx + 1 :]:
        if isinstance(msg, AIMessage):
            break
        if isinstance(msg, ToolMessage):
            tid = str(getattr(msg, "tool_call_id", "") or "").strip()
            pending.pop(tid, None)

    if not pending:
        return False

    missing = list(pending.items())
    insert_at = last_ai_idx + 1
    while insert_at < len(messages) and isinstance(messages[insert_at], ToolMessage):
        insert_at += 1
    for tid, name in missing:
        messages.insert(
            insert_at,
            ToolMessage(
                content=f"{_SYNTHETIC_TOOL_RESULT} (tool: {name})",
                tool_call_id=tid,
            ),
        )
        insert_at += 1
    logger.warning(
        "sealed %d missing tool_result(s) for last assistant message",
        len(missing),
    )
    return True


def _tool_call_id_and_name(tc: object) -> tuple[str, str]:
    if isinstance(tc, dict):
        tid = str(tc.get("id") or "").strip()
        name = str(tc.get("name") or "tool").strip() or "tool"
        return tid, name
    tid = str(getattr(tc, "id", "") or "").strip()
    name = str(getattr(tc, "name", "") or "tool").strip() or "tool"
    return tid, name


def _dedupe_ai_tool_calls(msg: AIMessage) -> tuple[AIMessage, bool]:
    """Drop duplicate tool_call ids within one assistant message."""
    raw = list(msg.tool_calls or [])
    if not raw:
        return msg, False
    seen: set[str] = set()
    kept: list = []
    changed = False
    for tc in raw:
        tid, _ = _tool_call_id_and_name(tc)
        if tid and tid in seen:
            changed = True
            continue
        if tid:
            seen.add(tid)
        kept.append(tc)
    if not changed:
        return msg, False
    return AIMessage(
        content=msg.content,
        tool_calls=kept,
        additional_kwargs=getattr(msg, "additional_kwargs", None) or {},
        response_metadata=getattr(msg, "response_metadata", None) or {},
        id=getattr(msg, "id", None),
    ), True


def repair_tool_message_pairing(messages: list) -> tuple[list, bool]:
    """
    Align AIMessage.tool_calls with ToolMessage.tool_call_id (CC ensureToolResultPairing).

    - Drop orphan ToolMessages (no matching pending tool_use).
    - Insert synthetic ToolMessages for tool_use blocks missing a result.
    - Drop duplicate tool_call ids across the transcript.
    """
    repaired = False
    out: list = []
    pending: dict[str, str] = {}
    global_seen: set[str] = set()

    def flush_pending() -> None:
        nonlocal repaired
        for tid, name in list(pending.items()):
            out.append(
                ToolMessage(
                    content=f"{_SYNTHETIC_TOOL_RESULT} (tool: {name})",
                    tool_call_id=tid,
                )
            )
            repaired = True
        pending.clear()

    for msg in messages:
        if isinstance(msg, AIMessage):
            flush_pending()
            msg, deduped = _dedupe_ai_tool_calls(msg)
            if deduped:
                repaired = True
            tool_calls = list(msg.tool_calls or [])
            filtered: list = []
            for tc in tool_calls:
                tid, name = _tool_call_id_and_name(tc)
                if tid and tid in global_seen:
                    repaired = True
                    continue
                if tid:
                    global_seen.add(tid)
                    pending[tid] = name
                filtered.append(tc)
            if len(filtered) != len(tool_calls):
                msg = AIMessage(
                    content=msg.content,
                    tool_calls=filtered,
                    additional_kwargs=getattr(msg, "additional_kwargs", None) or {},
                    response_metadata=getattr(msg, "response_metadata", None) or {},
                    id=getattr(msg, "id", None),
                )
                repaired = True
            out.append(msg)
            continue

        if isinstance(msg, ToolMessage):
            tid = str(getattr(msg, "tool_call_id", "") or "").strip()
            if tid and tid in pending:
                del pending[tid]
                out.append(msg)
            else:
                repaired = True
            continue

        out.append(msg)

    flush_pending()
    if repaired:
        logger.warning(
            "repaired tool_use/tool_result pairing (%d -> %d messages)",
            len(messages),
            len(out),
        )
    return out, repaired


def is_tool_pairing_llm_error(exc: BaseException) -> bool:
    text = str(exc).lower()
    return "tool call and result not match" in text or "(2013)" in text


def prune_message_tail(messages: list, *, keep_tail_messages: int = 80) -> int:
    """
    Drop oldest assistant/tool turns; always keep index 0 (system) and RUN_CONTEXT human.

    Tail slice never starts on a lone ToolMessage (avoids orphan tool_result at API boundary).
    Caller should run repair_tool_message_pairing after pruning.
    """
    if len(messages) <= keep_tail_messages + 2:
        return 0
    head = messages[:2]
    body = messages[2:]
    slice_start = max(0, len(body) - keep_tail_messages)
    while slice_start > 0 and isinstance(body[slice_start], ToolMessage):
        slice_start -= 1
    tail = body[slice_start:]
    removed = len(messages) - len(head) - len(tail)
    messages[:] = head + tail
    return removed
