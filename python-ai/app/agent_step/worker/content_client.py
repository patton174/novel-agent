"""HTTP client for Content internal run APIs."""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

INTERNAL_KEY_HEADER = "X-Internal-Service-Key"


class ContentRunClient:
    def __init__(self) -> None:
        self._base = settings.content_base_url.rstrip("/")
        self._key = settings.internal_service_key
        self._client = httpx.AsyncClient(timeout=60.0)

    async def close(self) -> None:
        await self._client.aclose()

    def _headers(self) -> dict[str, str]:
        return {INTERNAL_KEY_HEADER: self._key}

    async def try_lease(self, run_id: str, worker_id: str) -> dict[str, Any]:
        resp = await self._client.post(
            f"{self._base}/internal/agent/runs/{run_id}/lease",
            headers=self._headers(),
            json={"workerId": worker_id},
        )
        resp.raise_for_status()
        return resp.json()

    async def release_lease(self, run_id: str, worker_id: str) -> None:
        await self._client.delete(
            f"{self._base}/internal/agent/runs/{run_id}/lease",
            headers=self._headers(),
            params={"workerId": worker_id},
        )

    async def transition(self, run_id: str, status: str, error_message: str = "") -> None:
        await self._client.post(
            f"{self._base}/internal/agent/runs/{run_id}/transition",
            headers=self._headers(),
            json={"status": status, "errorMessage": error_message},
        )

    async def get_checkpoint(self, run_id: str) -> dict[str, Any] | None:
        resp = await self._client.get(
            f"{self._base}/internal/agent/runs/{run_id}/checkpoint",
            headers=self._headers(),
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()

    async def upsert_checkpoint(
        self,
        run_id: str,
        *,
        step_index: int,
        last_action: str,
        context_patch_json: str,
        worker_state_json: str,
    ) -> None:
        await self._client.put(
            f"{self._base}/internal/agent/runs/{run_id}/checkpoint",
            headers=self._headers(),
            json={
                "stepIndex": step_index,
                "lastAction": last_action,
                "contextPatchJson": context_patch_json,
                "transcriptRef": worker_state_json,
            },
        )

    async def append_event(
        self,
        run_id: str,
        *,
        event_id: str,
        event_type: str,
        payload: dict[str, Any],
    ) -> None:
        await self._client.post(
            f"{self._base}/internal/agent/runs/{run_id}/events",
            headers=self._headers(),
            json={
                "eventId": event_id,
                "eventType": event_type,
                "source": "worker",
                "payloadJson": json.dumps(payload, ensure_ascii=False),
            },
        )

    async def get_command_payload(self, run_id: str, command_id: str) -> dict[str, Any] | None:
        resp = await self._client.get(
            f"{self._base}/internal/agent/runs/{run_id}",
            headers=self._headers(),
        )
        if resp.status_code == 404:
            return None
        # Command payload is stored via recordCommand; fetch from commands list endpoint if added.
        # Fallback: caller passes payload in execute request for resume.
        _ = command_id
        return None
