"""HTTP client for Content internal crawl APIs."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

INTERNAL_KEY_HEADER = "X-Internal-Service-Key"


class CrawlContentClient:
    def __init__(self) -> None:
        self._base = settings.content_base_url.rstrip("/")
        self._key = settings.internal_service_key
        self._timeout = httpx.Timeout(connect=15.0, read=60.0, write=30.0, pool=15.0)
        self._client = httpx.AsyncClient(timeout=self._timeout)

    async def close(self) -> None:
        await self._client.aclose()

    def _headers(self) -> dict[str, str]:
        return {INTERNAL_KEY_HEADER: self._key}

    async def get_job(self, job_id: str) -> dict[str, Any] | None:
        resp = await self._client.get(
            f"{self._base}/internal/crawl/jobs/{job_id}",
            headers=self._headers(),
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()

    async def update_progress(
        self,
        job_id: str,
        *,
        chapters_total: int | None = None,
        chapters_done: int | None = None,
        title: str | None = None,
        status: str | None = None,
    ) -> None:
        payload: dict[str, Any] = {}
        if chapters_total is not None:
            payload["chaptersTotal"] = chapters_total
        if chapters_done is not None:
            payload["chaptersDone"] = chapters_done
        if title is not None:
            payload["title"] = title
        if status is not None:
            payload["status"] = status
        await self._client.post(
            f"{self._base}/internal/crawl/jobs/{job_id}/progress",
            headers=self._headers(),
            json=payload,
        )

    async def import_chapter(
        self,
        job_id: str,
        *,
        title: str,
        content: str,
        sort_order: int,
        source_url: str = "",
    ) -> dict[str, Any]:
        resp = await self._client.post(
            f"{self._base}/internal/crawl/jobs/{job_id}/chapters",
            headers=self._headers(),
            json={
                "title": title,
                "content": content,
                "sortOrder": sort_order,
                "sourceUrl": source_url,
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def init_catalog(
        self,
        job_id: str,
        *,
        title: str,
        author: str = "",
        description: str = "",
        source_url: str = "",
    ) -> dict[str, Any]:
        resp = await self._client.post(
            f"{self._base}/internal/crawl/jobs/{job_id}/catalog/init",
            headers=self._headers(),
            json={
                "title": title,
                "author": author,
                "description": description,
                "sourceUrl": source_url,
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def complete_job(self, job_id: str, *, catalog_novel_id: str, title: str) -> None:
        await self._client.post(
            f"{self._base}/internal/crawl/jobs/{job_id}/complete",
            headers=self._headers(),
            json={"catalogNovelId": catalog_novel_id, "title": title},
        )

    async def fail_job(self, job_id: str, *, error_message: str) -> None:
        await self._client.post(
            f"{self._base}/internal/crawl/jobs/{job_id}/fail",
            headers=self._headers(),
            json={"errorMessage": error_message},
        )

    async def append_log(self, job_id: str, *, level: str, message: str) -> None:
        try:
            resp = await self._client.post(
                f"{self._base}/internal/crawl/jobs/{job_id}/logs",
                headers=self._headers(),
                json={"level": level, "message": message},
            )
            resp.raise_for_status()
        except Exception as exc:
            logger.debug("append crawl log failed jobId=%s: %s", job_id, exc)
