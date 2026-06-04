"""CC-aligned context window metering (API usage + message estimation)."""

from __future__ import annotations

import json
from typing import Any

from langchain_core.messages import AIMessage, BaseMessage, SystemMessage, ToolMessage

from app.agent_step.context_usage import (
    _SYSTEM_OVERHEAD_TOKENS,
    context_window_tokens,
    estimate_json_tokens,
    estimate_text_tokens,
)
from app.agent_step.llm_trace import extract_cache_usage
from app.agent_step.plan_context import build_plan_context
from app.agent_step.schemas import PlanRequest

_WARNING_RATIO = 0.85


def get_token_count_from_api_usage(usage: dict[str, int] | None) -> int:
    """Full context window size for one API response (CC getTokenCountFromUsage)."""
    if not usage:
        return 0
    return (
        int(usage.get("input_tokens") or 0)
        + int(usage.get("cache_creation_input_tokens") or 0)
        + int(usage.get("cache_read_input_tokens") or 0)
        + int(usage.get("output_tokens") or 0)
    )


def _message_body_tokens(msg: BaseMessage) -> int:
    content = msg.content
    if content is None:
        return 0
    if isinstance(content, str):
        return estimate_text_tokens(content)
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, dict):
                text = block.get("text") or block.get("thinking") or ""
                if text:
                    parts.append(str(text))
            elif isinstance(block, str):
                parts.append(block)
        return estimate_text_tokens("\n".join(parts))
    return estimate_text_tokens(str(content))


def estimate_messages_tokens(messages: list[BaseMessage]) -> int:
    """Rough token count for LangChain message list (no external tokenizer)."""
    total = _SYSTEM_OVERHEAD_TOKENS
    for msg in messages:
        total += _message_body_tokens(msg)
        if isinstance(msg, AIMessage):
            for tc in msg.tool_calls or []:
                if isinstance(tc, dict):
                    total += estimate_json_tokens(tc)
                else:
                    total += estimate_text_tokens(
                        json.dumps(
                            {
                                "name": getattr(tc, "name", ""),
                                "args": getattr(tc, "args", None),
                            },
                            ensure_ascii=False,
                            default=str,
                        )
                    )
    return total


def token_count_from_last_api_response(messages: list[BaseMessage]) -> int:
    for msg in reversed(messages):
        if not isinstance(msg, AIMessage):
            continue
        usage = extract_cache_usage(msg)
        count = get_token_count_from_api_usage(usage)
        if count > 0:
            return count
    return 0


def token_count_with_estimation(messages: list[BaseMessage]) -> int:
    """Prefer last API usage; fall back to message heuristic (CC tokenCountWithEstimation)."""
    api = token_count_from_last_api_response(messages)
    estimated = estimate_messages_tokens(messages)
    if api > 0:
        return max(api, estimated)
    return estimated


def context_thresholds() -> dict[str, int]:
    limit = context_window_tokens()
    from app.agent_step.context_usage import compress_threshold_tokens

    compress_at = compress_threshold_tokens()
    return {
        "context_limit": limit,
        "compress_threshold_tokens": compress_at,
        "warning_threshold_tokens": int(limit * _WARNING_RATIO),
    }


def _plan_sections(req: PlanRequest | None) -> dict[str, int]:
    if req is None:
        return {}
    ctx_json = build_plan_context(req)
    return {key: estimate_json_tokens(value) for key, value in ctx_json.items()}


def measure_agent_context(
    messages: list[BaseMessage],
    *,
    req: PlanRequest | None = None,
    source: str = "estimate",
) -> dict[str, Any]:
    """Unified prompt measure for context.usage SSE."""
    limit = context_window_tokens()
    prompt_tokens = token_count_with_estimation(messages)
    percent = round(min(100.0, prompt_tokens / limit * 100.0), 1)
    percent_left = round(max(0.0, 100.0 - percent), 1)
    thresholds = context_thresholds()
    return {
        "prompt_tokens": prompt_tokens,
        "context_limit": limit,
        "context_percent": percent,
        "percent_left": percent_left,
        "sections": _plan_sections(req),
        "source": source,
        "thresholds": thresholds,
    }
