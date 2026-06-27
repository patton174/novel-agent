"""Persist / hydrate cross-run tool message chains via agent_trace_json (Redis)."""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage, messages_from_dict, messages_to_dict

from app.agent.backend.content_api import content_internal_url, internal_headers
from app.agent.harness.message_history import (
    _HISTORY_CONTENT_MAX,
    is_run_context_human,
)
from app.agent.harness.run_checkpoint import trim_messages_for_checkpoint
from app.agent.schemas import AgentRunContext

from app.config import settings

logger = logging.getLogger(__name__)


def _trace_tool_chain_max() -> int:
    return max(int(getattr(settings, "agent_trace_tool_chain_max", 128) or 128), 8)


def _trace_tool_body_max() -> int:
    return max(int(getattr(settings, "agent_trace_tool_body_max_chars", 80_000) or 80_000), 4000)


def _trim_history_content(text: str, *, limit: int = _HISTORY_CONTENT_MAX) -> str:
    body = str(text or "").strip()
    if len(body) <= limit:
        return body
    return body[: limit - 1] + "…"


def _trim_tool_body_for_trace(text: str) -> str:
    body = str(text or "")
    limit = _trace_tool_body_max()
    if len(body) <= limit:
        return body
    keep = limit - 120
    return (
        body[:keep]
        + f"\n… [trace truncated; {len(body)} chars total — re-call tool if needed]"
    )


def _find_current_user_index(messages: list[BaseMessage], user_message: str) -> int:
    needle = str(user_message or "").strip()
    if not needle:
        return -1
    for i in range(len(messages) - 1, -1, -1):
        msg = messages[i]
        if not isinstance(msg, HumanMessage) or is_run_context_human(msg):
            continue
        body = str(msg.content or "").strip()
        if body == needle or body.startswith(needle):
            return i
    return -1


def extract_tool_chain_for_trace(
    messages: list[BaseMessage],
    ctx: AgentRunContext,
) -> list[dict[str, Any]]:
    """
    Persist tool chain for cross-run hydrate (CC session file analogue).

    Unlike in-run microcompact, trace stores full tool bodies (per-tool cap only).
    Clearing old bodies happens on the next run via the same pre-LLM pipeline as CC.
    """
    start = _find_current_user_index(messages, ctx.user_message)
    if start < 0:
        return []
    tail = list(messages[start + 1 :])
    if not tail:
        return []

    if (
        len(tail) >= 2
        and isinstance(tail[-1], AIMessage)
        and not (tail[-1].tool_calls or [])
        and str(tail[-1].content or "").strip()
    ):
        tail = tail[:-1]

    if not tail:
        return []

    for i, msg in enumerate(tail):
        if isinstance(msg, ToolMessage):
            body = msg.content if isinstance(msg.content, str) else str(msg.content or "")
            trimmed = _trim_tool_body_for_trace(body)
            if trimmed != body:
                tail[i] = ToolMessage(
                    content=trimmed,
                    tool_call_id=str(msg.tool_call_id or ""),
                    name=getattr(msg, "name", None),
                    status=getattr(msg, "status", None),
                )

    trimmed = trim_messages_for_checkpoint(tail, max_messages=_trace_tool_chain_max())
    return messages_to_dict(trimmed)


def _tool_messages_from_step_states(steps: list[dict[str, Any]]) -> list[BaseMessage]:
    out: list[BaseMessage] = []
    for step in steps:
        if not isinstance(step, dict):
            continue
        if str(step.get("type") or "") != "tool":
            continue
        if str(step.get("status") or "") != "completed":
            continue
        tool_name = str(step.get("toolName") or step.get("tool") or "tool").strip() or "tool"
        step_id = str(step.get("stepId") or step.get("id") or "").strip()
        if not step_id:
            continue
        out.append(
            AIMessage(
                content="",
                tool_calls=[{"id": step_id, "name": tool_name, "args": {}}],
            )
        )
        excerpt = str(
            step.get("displayExcerpt")
            or step.get("outputSummary")
            or step.get("toolOutputDetail")
            or ""
        ).strip()
        from app.agent.context.compact_micro import MICROCOMPACT_CLEARED_MESSAGE

        body = excerpt if excerpt else MICROCOMPACT_CLEARED_MESSAGE
        out.append(ToolMessage(content=body, tool_call_id=step_id))
    return out


def messages_from_agent_trace(trace_json: str | None) -> list[BaseMessage]:
    if not trace_json or not str(trace_json).strip():
        return []
    try:
        parsed = json.loads(trace_json)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, dict):
        return []

    compact = parsed.get("messages_compact")
    if isinstance(compact, list) and compact:
        try:
            return messages_from_dict(compact)
        except Exception as exc:
            logger.warning("messages_compact hydrate failed: %s", exc)

    steps = parsed.get("stepStates")
    if isinstance(steps, list) and steps:
        return _tool_messages_from_step_states(steps)
    return []


def hydrate_session_history_messages(ctx: AgentRunContext) -> list[BaseMessage]:
    """Persisted turns as LangChain messages; assistant turns may include tool chain."""
    current = str(ctx.user_message or "").strip()
    out: list[BaseMessage] = []

    for turn in ctx.history or []:
        if not isinstance(turn, dict):
            continue
        role = str(turn.get("role") or "").strip().lower()
        content = _trim_history_content(str(turn.get("content") or ""))
        if not content:
            continue
        if role == "user" and content.startswith("我的回答："):
            continue
        if role == "user":
            if current and content.strip() == current:
                continue
            out.append(HumanMessage(content=content))
            continue
        if role == "assistant":
            trace = str(turn.get("agent_trace_json") or turn.get("agentTraceJson") or "").strip()
            tool_msgs = messages_from_agent_trace(trace) if trace else []
            if tool_msgs:
                out.extend(tool_msgs)
            out.append(AIMessage(content=content, tool_calls=[]))

    return out


async def persist_run_tool_chain_trace(
    ctx: AgentRunContext,
    messages: list[BaseMessage],
) -> None:
    compact = extract_tool_chain_for_trace(messages, ctx)
    if not compact:
        return
    session_id = str(ctx.session_id or "").strip()
    run_id = str(ctx.run_id or "").strip()
    if not session_id or not run_id or ctx.user_id <= 0:
        return
    patch = json.dumps({"messages_compact": compact, "trace_version": 2}, ensure_ascii=False)
    url = content_internal_url(f"agent/sessions/{session_id}/runs/{run_id}/trace")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                params={"userId": ctx.user_id},
                headers=internal_headers(),
                json={"traceJson": patch},
            )
            resp.raise_for_status()
    except Exception as exc:
        logger.warning(
            "run tool-chain trace persist skipped session=%s run=%s: %s",
            session_id,
            run_id,
            exc,
        )
