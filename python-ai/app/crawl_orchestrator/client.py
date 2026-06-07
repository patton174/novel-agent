"""HTTP client for crawl orchestrator internal APIs."""

from __future__ import annotations

from typing import Any

import httpx

from app.config import settings

INTERNAL_KEY_HEADER = "X-Internal-Service-Key"


class OrchestratorClient:
    def __init__(self) -> None:
        self._base = settings.content_base_url.rstrip("/")
        self._key = settings.internal_service_key
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=15.0, read=90.0, write=30.0, pool=15.0)
        )

    async def close(self) -> None:
        await self._client.aclose()

    def _headers(self) -> dict[str, str]:
        return {INTERNAL_KEY_HEADER: self._key}

    async def get_state(self) -> dict[str, Any]:
        resp = await self._client.get(
            f"{self._base}/internal/crawl/orchestrator",
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    async def record_decision(self, decision: str) -> None:
        await self._client.post(
            f"{self._base}/internal/crawl/orchestrator/decision",
            headers=self._headers(),
            json={"decision": decision[:2000]},
        )

    async def mark_sleeping(self) -> dict[str, Any]:
        resp = await self._client.post(
            f"{self._base}/internal/crawl/orchestrator/sleep",
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    async def complete_goal(self) -> dict[str, Any]:
        resp = await self._client.post(
            f"{self._base}/internal/crawl/orchestrator/complete",
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    async def running_count(self) -> dict[str, int]:
        resp = await self._client.get(
            f"{self._base}/internal/crawl/jobs/running-count",
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    async def list_incomplete(self, limit: int = 50) -> list[dict[str, Any]]:
        resp = await self._client.get(
            f"{self._base}/internal/crawl/catalog/incomplete",
            headers=self._headers(),
            params={"limit": limit},
        )
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, list) else []

    async def page_jobs(self, page: int = 1, size: int = 20) -> dict[str, Any]:
        resp = await self._client.get(
            f"{self._base}/internal/crawl/orchestrator/jobs",
            headers=self._headers(),
            params={"pageCurrent": page, "pageSize": size},
        )
        resp.raise_for_status()
        return resp.json()

    async def create_and_start_job(
        self,
        *,
        source_url: str,
        config_json: str,
        catalog_novel_id: str = "",
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "sourceUrl": source_url,
            "configJson": config_json,
        }
        if catalog_novel_id:
            payload["catalogNovelId"] = catalog_novel_id
        resp = await self._client.post(
            f"{self._base}/internal/crawl/orchestrator/jobs",
            headers=self._headers(),
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()

    async def pause_job(self, job_id: str) -> dict[str, Any]:
        resp = await self._client.post(
            f"{self._base}/internal/crawl/jobs/{job_id}/pause",
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    async def get_job(self, job_id: str) -> dict[str, Any]:
        resp = await self._client.get(
            f"{self._base}/internal/crawl/jobs/{job_id}",
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()
