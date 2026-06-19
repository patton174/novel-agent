"""HTTP client for Content internal agent-run checkpoint APIs."""

from __future__ import annotations

import httpx

from app.agent.backend.content_api import content_internal_url, internal_headers


class ContentRunCheckpointClient:
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=60.0)

    async def close(self) -> None:
        await self._client.aclose()

    async def upsert_checkpoint(
        self,
        run_id: str,
        *,
        step_index: int,
        last_action: str,
        context_patch_json: str,
        checkpoint_state_json: str,
    ) -> None:
        await self._client.put(
            content_internal_url(f"/agent/runs/{run_id}/checkpoint"),
            headers=internal_headers(),
            json={
                "stepIndex": step_index,
                "lastAction": last_action,
                "contextPatchJson": context_patch_json,
                "transcriptRef": checkpoint_state_json,
            },
        )
