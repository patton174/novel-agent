"""SearchSessionHistory — session RAG + lazy full trace fetch."""

from __future__ import annotations

import json
import logging
from typing import Any

from langchain_core.messages import AIMessage, ToolMessage, messages_from_dict

from app.agent.backend.session_history_client import fetch_run_trace, fetch_session_messages
from app.agent.schemas import AgentRunContext
from app.agent.tools.schemas import SearchSessionHistoryInput
from app.agent.tools.tool import ToolCallResult, build_tool

logger = logging.getLogger(__name__)

_BODY_MAX = 80_000


def _clip(text: str, limit: int) -> str:
    body = str(text or "")
    if len(body) <= limit:
        return body
    return body[: limit - 80] + f"\n… [{len(body) - limit + 80} chars omitted]"


def _trace_tool_bodies(trace_json: str, *, max_chars: int) -> list[dict[str, Any]]:
    if not trace_json or not trace_json.strip():
        return []
    try:
        parsed = json.loads(trace_json)
    except json.JSONDecodeError:
        return []
    compact = parsed.get("messages_compact") if isinstance(parsed, dict) else None
    if not isinstance(compact, list) or not compact:
        return []
    try:
        msgs = messages_from_dict(compact)
    except Exception:
        return []
    out: list[dict[str, Any]] = []
    for msg in msgs:
        if isinstance(msg, AIMessage) and msg.tool_calls:
            for tc in msg.tool_calls:
                name = tc.get("name") if isinstance(tc, dict) else getattr(tc, "name", "tool")
                tid = tc.get("id") if isinstance(tc, dict) else getattr(tc, "id", "")
                out.append({"tool_call_id": tid, "tool_name": name, "phase": "call"})
        elif isinstance(msg, ToolMessage):
            out.append(
                {
                    "tool_call_id": msg.tool_call_id,
                    "tool_name": getattr(msg, "name", None) or "tool",
                    "body": _clip(
                        msg.content if isinstance(msg.content, str) else str(msg.content or ""),
                        max_chars,
                    ),
                }
            )
    return out


async def _fetch_run_bundle(
    ctx: AgentRunContext,
    run_id: str,
    *,
    max_chars: int,
) -> dict[str, Any]:
    session_id = str(ctx.session_id or "")
    messages = await fetch_session_messages(
        user_id=ctx.user_id,
        session_id=session_id,
        limit=20,
        run_id=run_id,
    )
    trace = await fetch_run_trace(
        user_id=ctx.user_id,
        session_id=session_id,
        run_id=run_id,
    )
    turns: list[dict[str, Any]] = []
    for row in messages:
        role = str(row.get("role") or "")
        content = _clip(str(row.get("content") or ""), max_chars)
        if content:
            turns.append({"role": role, "content": content, "created_at": row.get("createdAt")})
    bundle: dict[str, Any] = {
        "run_id": run_id,
        "turns": turns,
    }
    if trace.strip():
        bundle["tool_chain"] = _trace_tool_bodies(trace, max_chars=max_chars)
    return bundle


async def search_session_history(
    ctx: AgentRunContext,
    inp: SearchSessionHistoryInput,
) -> ToolCallResult:
    session_id = str(ctx.session_id or "").strip()
    if not session_id or ctx.user_id <= 0:
        return ToolCallResult(
            content="<tool_use_error>missing session_id</tool_use_error>",
            is_error=True,
        )

    max_chars = min(max(int(inp.max_body_chars or 12_000), 2000), _BODY_MAX)
    run_id = str(inp.run_id or "").strip()

    if run_id:
        bundle = await _fetch_run_bundle(ctx, run_id, max_chars=max_chars)
        return ToolCallResult(
            content=json.dumps({"status": "ok", "mode": "run_fetch", "hit": bundle}, ensure_ascii=False)
        )

    query = str(inp.query or "").strip()
    if not query:
        return ToolCallResult(
            content="<tool_use_error>query or run_id required</tool_use_error>",
            is_error=True,
        )

    hits: list[dict[str, Any]] = []
    query_plan_meta: dict[str, Any] | None = None

    try:
        from app.rag.session_search import search_session_with_query

        plan, index_hits = await search_session_with_query(ctx, query, top_k=inp.top_k)
        query_plan_meta = {
            "primary": plan.primary,
            "variants": plan.variants[:4],
            "rewrite_source": plan.rewrite_source,
        }
        for h in index_hits:
            hits.append(
                {
                    "run_id": h.get("run_id"),
                    "kind": h.get("turn_kind"),
                    "role": h.get("role"),
                    "tool_name": h.get("tool_name"),
                    "snippet": _clip(str(h.get("content") or ""), 900),
                    "score": round(float(h.get("rrf_score") or h.get("score") or 0.0), 4),
                }
            )
    except Exception as exc:
        logger.warning("SearchSessionHistory index path failed: %s", exc)

    if inp.include_tool_bodies and hits:
        seen_runs: set[str] = set()
        for hit in hits[: min(inp.top_k, 5)]:
            rid = str(hit.get("run_id") or "").strip()
            if not rid or rid in seen_runs:
                continue
            seen_runs.add(rid)
            trace = await fetch_run_trace(
                user_id=ctx.user_id,
                session_id=session_id,
                run_id=rid,
            )
            if trace.strip():
                hit["tool_chain"] = _trace_tool_bodies(trace, max_chars=max_chars)

    if not hits:
        return ToolCallResult(
            content=json.dumps(
                {
                    "hits": [],
                    "status": "no_match",
                    "hint": "No indexed session turns matched. Try different keywords or pass run_id.",
                    "query_plan": query_plan_meta,
                },
                ensure_ascii=False,
            )
        )

    return ToolCallResult(
        content=json.dumps(
            {
                "hits": hits,
                "status": "ok",
                "mode": "hybrid_recall",
                "query_plan": query_plan_meta,
            },
            ensure_ascii=False,
        )
    )


SESSION_HISTORY_TOOLS = [
    build_tool(
        name="SearchSessionHistory",
        description=(
            "Search prior turns in this chat session (embedding + BM25 + query rewrite). "
            "Pass run_id to fetch full tool outputs for a specific run."
        ),
        input_model=SearchSessionHistoryInput,
        call=search_session_history,
        is_concurrency_safe=lambda _i: True,
        is_read_only=lambda _i: True,
        is_enabled=lambda ctx: bool(str(ctx.session_id or "").strip()),
    ),
]
