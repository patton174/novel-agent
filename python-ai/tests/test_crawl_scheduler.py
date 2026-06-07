"""Orchestrator scheduler tests."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.crawl.orchestrator.scheduler import OrchestratorScheduler, normalize_source_url


def test_normalize_source_url_strips_trailing_slash():
    assert normalize_source_url("https://ex.com/book/1/") == "https://ex.com/book/1"


@pytest.mark.asyncio
async def test_scheduler_rejects_duplicate_inflight():
    scheduler = OrchestratorScheduler()
    client = MagicMock()
    client.running_count = AsyncMock(return_value={"count": 0, "max": 3})
    client.page_jobs = AsyncMock(return_value={"list": []})

    ok, _ = await scheduler.can_create_job(client, "https://ex.com/a")
    assert ok is True
    scheduler.register("https://ex.com/a/")
    ok2, msg = await scheduler.can_create_job(client, "https://ex.com/a")
    assert ok2 is False
    assert "派发" in msg
