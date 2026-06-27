"""Internal Content API client for session message / trace recall."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.agent.backend.content_api import content_internal_url, internal_headers, unwrap_result

logger = logging.getLogger(__name__)


async def fetch_session_messages(
    *,
    user_id: int,
    session_id: str,
    limit: int = 100,
    run_id: str | None = None,
) -> list[dict[str, Any]]:
    if user_id <= 0 or not str(session_id or "").strip():
        return []
    params: dict[str, Any] = {"userId": user_id, "limit": max(1, min(limit, 500))}
    if run_id and str(run_id).strip():
        params["run_id"] = str(run_id).strip()
    url = content_internal_url(f"/agent/sessions/{session_id}/messages")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params, headers=internal_headers())
            resp.raise_for_status()
            data = unwrap_result(resp.json())
    except Exception as exc:
        logger.warning("fetch_session_messages failed session=%s: %s", session_id, exc)
        return []
    if not isinstance(data, list):
        return []
    return [row for row in data if isinstance(row, dict)]


async def fetch_run_trace(
    *,
    user_id: int,
    session_id: str,
    run_id: str,
) -> str:
    if user_id <= 0 or not session_id.strip() or not run_id.strip():
        return ""
    url = content_internal_url(f"/agent/sessions/{session_id}/runs/{run_id}/trace")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                url,
                params={"userId": user_id},
                headers=internal_headers(),
            )
            resp.raise_for_status()
            data = unwrap_result(resp.json())
    except Exception as exc:
        logger.warning("fetch_run_trace failed run=%s: %s", run_id, exc)
        return ""
    if isinstance(data, dict):
        return str(data.get("trace_json") or data.get("traceJson") or "")
    return ""
