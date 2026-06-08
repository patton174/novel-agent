"""Billing usage reporter — forwards LLM token usage to PyAI → MQ → agent-billing."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings
from app.core.trace_middleware import trace_id_var

logger = logging.getLogger(__name__)


def _model_cost_micros(model: str | None, usage: dict[str, int]) -> int:
    """Rough cost estimate in micro-units (1e-6 USD) for metering dashboards."""
    input_t = int(usage.get("input_tokens") or 0)
    output_t = int(usage.get("output_tokens") or 0)
    cache_read = int(usage.get("cache_read_input_tokens") or 0)
    cache_write = int(usage.get("cache_creation_input_tokens") or 0)
    name = (model or "").lower()
    if "deepseek" in name:
        in_rate, out_rate = 140, 280
    elif "gpt-4" in name:
        in_rate, out_rate = 2500, 10000
    else:
        in_rate, out_rate = 200, 400
    total = input_t + cache_read + cache_write
    return (total * in_rate + output_t * out_rate) // 1000


async def report_llm_usage(
    *,
    user_id: int,
    run_id: str,
    session_id: str | None,
    model: str | None,
    usage: dict[str, int] | None,
    step_index: int | None = None,
) -> None:
    if not settings.billing_report_enabled:
        return
    if user_id <= 0:
        return
    usage = usage or {}
    input_tokens = int(usage.get("input_tokens") or 0)
    output_tokens = int(usage.get("output_tokens") or 0)
    cache_read = int(usage.get("cache_read_input_tokens") or 0)
    cache_write = int(usage.get("cache_creation_input_tokens") or 0)
    if input_tokens + output_tokens + cache_read + cache_write <= 0:
        return

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
        "totalCostMicros": _model_cost_micros(model, usage),
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
