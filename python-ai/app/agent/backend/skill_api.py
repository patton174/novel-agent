"""HTTP client for novel-studio internal agent skills API."""

from __future__ import annotations

from typing import Any

import httpx

from app.agent.backend.content_api import (
    content_internal_url,
    extract_api_error,
    unwrap_result,
    user_headers,
)


async def fetch_skill(skill_id: str, user_id: int) -> dict[str, Any]:
    """GET ``/internal/agent/skills/{idOrSlug}`` with internal key + user header."""
    slug = (skill_id or "").strip()
    if not slug:
        raise ValueError("skill_id required")
    url = content_internal_url(f"/agent/skills/{slug}")
    headers = user_headers(user_id)
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers=headers)
    body: Any = None
    try:
        body = resp.json() if resp.content else None
    except Exception:
        body = None
    if resp.status_code >= 400:
        raise RuntimeError(
            extract_api_error(
                body,
                status_code=resp.status_code,
                default=f"HTTP {resp.status_code}",
            )
        )
    data = unwrap_result(body)
    if not isinstance(data, dict):
        raise RuntimeError("invalid skill response")
    return data
