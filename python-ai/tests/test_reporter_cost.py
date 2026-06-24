"""reporter _compute_cost + byok 跳过。"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.billing import reporter


def test_compute_cost_from_pricing():
    pricing = {"input_per_1k_micros": 2500, "output_per_1k_micros": 10000, "multiplier": 1.5}
    assert reporter._compute_cost(1000, 500, pricing) == 11250


def test_compute_cost_none_pricing_returns_none():
    assert reporter._compute_cost(100, 50, None) is None


def test_compute_cost_partial_pricing():
    pricing = {"input_per_1k_micros": 1000, "output_per_1k_micros": None, "multiplier": 1.0}
    assert reporter._compute_cost(1000, 500, pricing) == 1000


@pytest.mark.asyncio
async def test_report_llm_usage_byok_skips_post():
    with patch("app.billing.reporter.httpx.AsyncClient") as client_cls:
        client = AsyncMock()
        client_cls.return_value.__aenter__.return_value = client
        await reporter.report_llm_usage(
            user_id=10,
            run_id="r",
            session_id="s",
            model="x",
            usage={"input_tokens": 100, "output_tokens": 50},
            step_index=0,
            pricing=None,
            byok=True,
            model_code="byok:1",
        )
        client.post.assert_not_called()
