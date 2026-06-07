"""Build rich context for orchestrator LLM each cycle."""

from __future__ import annotations

import json
from typing import Any

from app.crawl.orchestrator.client import OrchestratorClient

ACTIVE_JOB_STATUSES = frozenset({"RUNNING", "PAUSED", "PENDING"})


def _compact_job(job: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": job.get("id"),
        "sourceUrl": job.get("sourceUrl"),
        "title": job.get("title"),
        "status": job.get("status"),
        "chaptersDone": job.get("chaptersDone"),
        "chaptersTotal": job.get("chaptersTotal"),
        "catalogNovelId": job.get("catalogNovelId"),
        "errorMessage": job.get("errorMessage"),
    }


def _compact_novel(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item.get("id"),
        "title": item.get("title"),
        "author": item.get("author"),
        "sourceUrl": item.get("sourceUrl"),
        "coverUrl": item.get("coverUrl"),
        "chapterCount": item.get("chapterCount"),
        "chaptersDone": item.get("chaptersDone"),
        "chaptersExpected": item.get("chaptersExpected"),
        "complete": item.get("complete"),
        "latestJobId": item.get("latestJobId"),
        "latestJobStatus": item.get("latestJobStatus"),
    }


async def build_cycle_context(client: OrchestratorClient) -> dict[str, Any]:
    state = await client.get_state()
    running = await client.running_count()
    overview = await client.catalog_overview(limit=30)
    jobs_page = await client.page_jobs(page=1, size=30)
    job_list = jobs_page.get("list") if isinstance(jobs_page, dict) else []
    if not isinstance(job_list, list):
        job_list = []

    active_jobs = [j for j in job_list if str(j.get("status") or "").upper() in ACTIVE_JOB_STATUSES]
    active_urls = sorted(
        {str(j.get("sourceUrl") or "").strip() for j in active_jobs if str(j.get("sourceUrl") or "").strip()}
    )

    return {
        "orchestrator": state,
        "runningCount": running,
        "catalog": {
            "totalNovels": overview.get("totalNovels", 0),
            "missingCoverCount": overview.get("missingCoverCount", 0),
            "missingCover": [_compact_novel(x) for x in (overview.get("missingCover") or [])[:15]],
            "incomplete": [_compact_novel(x) for x in (overview.get("incomplete") or [])[:15]],
            "recentNovels": [_compact_novel(x) for x in (overview.get("recentNovels") or [])[:10]],
        },
        "activeJobs": [_compact_job(j) for j in active_jobs[:10]],
        "activeSourceUrls": active_urls,
    }


def format_cycle_context(ctx: dict[str, Any]) -> str:
    return json.dumps(ctx, ensure_ascii=False, indent=2)
