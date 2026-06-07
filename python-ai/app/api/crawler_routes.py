"""Crawler API routes (admin preview + internal execute)."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.crawl.job_executor import has_capacity, run_bounded
from app.crawl.runner import execute_crawl_job, preview_crawl

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/crawl", tags=["Crawler"])


class CrawlPreviewRequest(BaseModel):
    source_url: str = Field(..., min_length=8)
    site_config: dict[str, Any] | None = None


class CrawlPreviewResponse(BaseModel):
    ok: bool
    title: str = ""
    author: str = ""
    chapter_count: int = 0
    sample_chapters: list[dict[str, str]] = Field(default_factory=list)
    message: str = ""
    goal_summary: str = ""


class CrawlExecuteRequest(BaseModel):
    job_id: str = Field(..., min_length=1)
    source_url: str = Field(..., min_length=8)
    site_config: dict[str, Any] | None = None


class CrawlExecuteResponse(BaseModel):
    accepted: bool = True
    job_id: str


def _verify_internal_key(key: str | None) -> None:
    expected = settings.internal_service_key
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="invalid internal service key")


@router.post("/preview", response_model=CrawlPreviewResponse)
async def crawl_preview(body: CrawlPreviewRequest):
    result = await preview_crawl(body.source_url, body.site_config)
    return CrawlPreviewResponse(
        ok=result.ok,
        title=result.title,
        author=result.author,
        chapter_count=result.chapter_count,
        sample_chapters=result.sample_chapters,
        message=result.message,
        goal_summary=getattr(result, "goal_summary", "") or "",
    )


internal_router = APIRouter()


@internal_router.post("/crawl/execute", response_model=CrawlExecuteResponse)
async def crawl_execute_internal(
    body: CrawlExecuteRequest,
    x_internal_service_key: str | None = Header(default=None, alias="X-Internal-Service-Key"),
):
    _verify_internal_key(x_internal_service_key)
    if not has_capacity():
        raise HTTPException(status_code=429, detail="crawl worker at capacity")
    logger.info("crawl execute accepted jobId=%s url=%s", body.job_id, body.source_url)

    async def _run() -> None:
        await execute_crawl_job(
            job_id=body.job_id,
            source_url=body.source_url,
            site_config=body.site_config,
        )

    asyncio.create_task(run_bounded(body.job_id, _run))
    return CrawlExecuteResponse(accepted=True, job_id=body.job_id)


class OrchestratorAgentStatusResponse(BaseModel):
    enabled: bool
    llm_configured: bool
    poll_sec: int


class OrchestratorRunOnceResponse(BaseModel):
    accepted: bool = True


@internal_router.get("/orchestrator/status", response_model=OrchestratorAgentStatusResponse)
async def orchestrator_status_internal(
    x_internal_service_key: str | None = Header(default=None, alias="X-Internal-Service-Key"),
):
    _verify_internal_key(x_internal_service_key)
    from app.core.llm import llm_provider

    return OrchestratorAgentStatusResponse(
        enabled=settings.crawl_orchestrator_enabled,
        llm_configured=llm_provider.is_configured,
        poll_sec=max(5, settings.crawl_orchestrator_poll_sec),
    )


@internal_router.post("/orchestrator/run-once", response_model=OrchestratorRunOnceResponse)
async def orchestrator_run_once_internal(
    x_internal_service_key: str | None = Header(default=None, alias="X-Internal-Service-Key"),
):
    _verify_internal_key(x_internal_service_key)
    from app.crawl.orchestrator.loop import run_orchestrator_once, signal_orchestrator_wake

    signal_orchestrator_wake()
    asyncio.create_task(run_orchestrator_once())
    return OrchestratorRunOnceResponse(accepted=True)
