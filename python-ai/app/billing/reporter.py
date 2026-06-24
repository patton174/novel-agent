"""Billing usage reporter — forwards LLM token usage to PyAI → MQ → agent-billing."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings
from app.core.trace_middleware import trace_id_var

logger = logging.getLogger(__name__)


def _compute_cost(input_tokens: int, output_tokens: int, pricing: dict | None) -> int | None:
    """按模型定价计算成本（micros）。pricing=None 不计费。"""
    if pricing is None:
        return None
    inp = int(pricing.get("input_per_1k_micros") or 0)
    out = int(pricing.get("output_per_1k_micros") or 0)
    mult = float(pricing.get("multiplier") or 1.0)
    cost = (input_tokens * inp + output_tokens * out) / 1000 * mult
    return int(cost)


async def report_llm_usage(
    *,
    user_id: int,
    run_id: str,
    session_id: str | None,
    model: str | None,
    usage: dict[str, int] | None,
    step_index: int | None = None,
    pricing: dict | None = None,
    byok: bool = False,
    model_code: str | None = None,
) -> None:
    if not settings.billing_report_enabled:
        return
    if user_id <= 0:
        return
    if byok:
        return
    usage = usage or {}
    input_tokens = int(usage.get("input_tokens") or 0)
    output_tokens = int(usage.get("output_tokens") or 0)
    cache_read = int(usage.get("cache_read_input_tokens") or 0)
    cache_write = int(usage.get("cache_creation_input_tokens") or 0)
    if input_tokens + output_tokens + cache_read + cache_write <= 0:
        return

    cost = _compute_cost(input_tokens, output_tokens, pricing)
    unit_cost = None
    if pricing is not None:
        unit_cost = int(pricing.get("input_per_1k_micros") or 0) + int(
            pricing.get("output_per_1k_micros") or 0
        )

    trace_id = trace_id_var.get() or None
    idempotency = f"{run_id}:{step_index or 0}:{input_tokens}:{output_tokens}"
    payload: dict[str, Any] = {
        "userId": user_id,
        "runId": run_id,
        "sessionId": session_id,
        "traceId": trace_id,
        "eventType": "llm_call",
        "model": model,
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "cacheReadTokens": cache_read,
        "cacheWriteTokens": cache_write,
        "totalCostMicros": cost if cost is not None else 0,
        "unitCostMicros": unit_cost,
        "byok": False,
        "modelCode": model_code,
        "idempotencyKey": idempotency,
        "metadata": {"phase": "main_loop", "stepIndex": step_index},
    }

    url = settings.billing_report_url.rstrip("/") + "/internal/billing/usage/report"
    headers = {"X-Internal-Service-Key": settings.internal_service_key}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
    except Exception as ex:
        logger.warning("billing usage report failed: %s", ex)
