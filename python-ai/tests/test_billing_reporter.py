"""Tests for billing usage reporter."""

from unittest.mock import patch

import pytest

from app.billing.reporter import _model_cost_micros, report_llm_usage


def test_model_cost_micros_positive():
    cost = _model_cost_micros("deepseek-chat", {"input_tokens": 1000, "output_tokens": 500})
    assert cost > 0


@pytest.mark.asyncio
async def test_report_skipped_when_disabled(monkeypatch):
    monkeypatch.setattr("app.billing.reporter.settings.billing_report_enabled", False)
    with patch("httpx.AsyncClient") as mock_client:
        await report_llm_usage(
            user_id=1,
            run_id="run-1",
            session_id="sess-1",
            model="deepseek-chat",
            usage={"input_tokens": 10, "output_tokens": 5},
        )
        mock_client.assert_not_called()


@pytest.mark.asyncio
async def test_report_posts_payload(monkeypatch):
    monkeypatch.setattr("app.billing.reporter.settings.billing_report_enabled", True)
    monkeypatch.setattr("app.billing.reporter.settings.billing_report_url", "http://pyai:8082")
    monkeypatch.setattr("app.billing.reporter.settings.internal_service_key", "test-key")

    captured: dict = {}

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, url, **kwargs):
            captured["url"] = url
            captured.update(kwargs)
            return FakeResponse()

    with patch("httpx.AsyncClient", FakeClient):
        await report_llm_usage(
            user_id=42,
            run_id="run-abc",
            session_id="sess-abc",
            model="deepseek-chat",
            usage={"input_tokens": 100, "output_tokens": 50},
            step_index=3,
        )

    assert captured["json"]["userId"] == 42
    assert captured["json"]["runId"] == "run-abc"
    assert captured["headers"]["X-Internal-Service-Key"] == "test-key"
