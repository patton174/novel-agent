"""Main-loop LangChain message list: RUN_CONTEXT refresh and tail pruning."""

from __future__ import annotations

import json
import logging

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from app.agent.context.prompting.run_context import format_run_context_block
from app.agent.harness.plan_context import build_plan_context
from app.agent.harness.transcript import AgentTranscript
from app.agent.schemas import AgentRunContext, PlanRequest

logger = logging.getLogger(__name__)

_SYNTHETIC_TOOL_RESULT = (
    "[Tool result missing — conversation history was repaired before the next model call. "
    "Do not assume this tool succeeded; re-call tools if you still need the data.]"
)


def build_run_context_human(
    ctx: AgentRunContext,
    transcript: AgentTranscript,
) -> str:
    req = PlanRequest(
        context=ctx,
        think_content=transcript.latest_think_text(),
        think_tool_input={"topic": ctx.user_message},
        transcript=transcript.format_for_plan(),
    )
    ctx_json = build_plan_context(req)
    return "\n\n".join(
        [
            format_run_context_block(
                ctx,
                include_think_summary=True,
                transcript_rows=transcript.format_for_plan(),
            ),
            f"RUN_CONTEXT_JSON:\n{json.dumps(ctx_json, ensure_ascii=False)[:14000]}",
            f"用户消息：{ctx.user_message}",
            "请通过 tool_use 调用工具完成任务。",
        ]
    )


def refresh_run_context_human(
    messages: list,
    ctx: AgentRunContext,
    transcript: AgentTranscript,
) -> None:
    """Update the primary HumanMessage so each LLM turn sees latest context_patch."""
    block = build_run_context_human(ctx, transcript)
    for i, msg in enumerate(messages):
        if isinstance(msg, HumanMessage):
            messages[i] = HumanMessage(content=block)
            return
    messages.insert(1, HumanMessage(content=block))


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
            tool_calls: list = []
            for tc in msg.tool_calls or []:
                tid, name = _tool_call_id_and_name(tc)
                if not tid:
                    tool_calls.append(tc)
                    continue
                if tid in global_seen:
                    repaired = True
                    continue
                global_seen.add(tid)
                tool_calls.append(tc)
                pending[tid] = name
            if tool_calls != list(msg.tool_calls or []):
                msg = AIMessage(
                    content=msg.content,
                    tool_calls=tool_calls,
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

        flush_pending()
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
    Drop oldest assistant/tool turns; always keep index 0 (system) and first HumanMessage.

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
