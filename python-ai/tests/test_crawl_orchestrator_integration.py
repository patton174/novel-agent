"""Integration: orchestrator CreateCrawlJob slot + URL dedupe."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.crawl.orchestrator.scheduler import get_orchestrator_scheduler
from app.crawl.orchestrator.tools import run_orchestrator_tool


@pytest.fixture(autouse=True)
def _reset_scheduler_inflight():
    get_orchestrator_scheduler()._local_inflight.clear()
    yield
    get_orchestrator_scheduler()._local_inflight.clear()


def _client(*, running: int = 0, jobs: list | None = None) -> MagicMock:
    client = MagicMock()
    client.running_count = AsyncMock(return_value={"count": running, "max": 3})
    client.page_jobs = AsyncMock(return_value={"list": jobs or []})
    client.create_and_start_job = AsyncMock(
        return_value={
            "id": "job-new",
            "sourceUrl": "https://ex.com/book/1",
            "title": "",
            "status": "RUNNING",
            "chaptersDone": 0,
            "chaptersTotal": 0,
            "catalogNovelId": "",
            "errorMessage": "",
        }
    )
    return client


@pytest.mark.asyncio
async def test_create_job_rejects_when_slots_full():
    client = _client(running=3)
    result = await run_orchestrator_tool(
        client,
        "CreateCrawlJob",
        {
            "source_url": "https://ex.com/book/9",
            "goal": "抓取《新书》全部章节入库",
        },
        goal="爬取站点新书",
    )
    payload = json.loads(result)
    assert payload["ok"] is False
    assert "槽位" in payload["error"]
    client.create_and_start_job.assert_not_awaited()


@pytest.mark.asyncio
async def test_create_job_rejects_duplicate_active_url():
    client = _client(
        running=1,
        jobs=[{"status": "RUNNING", "sourceUrl": "https://ex.com/book/1"}],
    )
    result = await run_orchestrator_tool(
        client,
        "CreateCrawlJob",
        {
            "source_url": "https://ex.com/book/1/",
            "goal": "抓取《测试》全部章节入库",
        },
        goal="爬取测试站",
    )
    payload = json.loads(result)
    assert payload["ok"] is False
    assert "重复" in payload["error"]


@pytest.mark.asyncio
async def test_create_job_success_registers_cycle_ctx():
    client = _client(running=0)
    cycle_ctx: dict = {"activeSourceUrls": [], "activeJobs": []}
    result = await run_orchestrator_tool(
        client,
        "CreateCrawlJob",
        {
            "source_url": "https://ex.com/book/2",
            "goal": "抓取《第二本》全部章节入库",
        },
        goal="爬两本书",
        cycle_ctx=cycle_ctx,
    )
    payload = json.loads(result)
    assert payload["ok"] is True
    assert "https://ex.com/book/2" in cycle_ctx["activeSourceUrls"]
    assert cycle_ctx["activeJobs"][0]["id"] == "job-new"
    client.create_and_start_job.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_job_rejects_second_same_url_in_cycle():
    client = _client(running=0)
    cycle_ctx: dict = {
        "activeSourceUrls": ["https://ex.com/book/2"],
        "activeJobs": [{"id": "j1", "sourceUrl": "https://ex.com/book/2", "status": "RUNNING"}],
    }
    result = await run_orchestrator_tool(
        client,
        "CreateCrawlJob",
        {
            "source_url": "https://ex.com/book/2",
            "goal": "抓取《第二本》续爬",
        },
        goal="爬两本书",
        cycle_ctx=cycle_ctx,
    )
    payload = json.loads(result)
    assert payload["ok"] is False
    assert "重复" in payload["error"]
