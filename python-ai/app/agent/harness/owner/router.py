"""Internal routes for owner Java SSE proxy (not browser-facing)."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Header, HTTPException, Request

from app.agent.harness.owner.run_stream import build_run_stream_response
from app.agent.schemas import RunRequest
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


def _verify_internal_key(key: str | None) -> None:
    expected = settings.internal_service_key
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="invalid internal service key")


@router.post("/agent/run/stream")
async def internal_agent_run_stream(
    raw_request: Request,
    x_internal_service_key: str | None = Header(default=None, alias="X-Internal-Service-Key"),
):
    """Owner novel-studio JVM: long-lived SSE for query_loop (bypasses agent_allow_direct_stream)."""
    _verify_internal_key(x_internal_service_key)
    try:
        body = await raw_request.json()
        req = RunRequest.model_validate(body)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    logger.info("internal agent run stream run_id=%s", req.context.run_id)
    return build_run_stream_response(req)
