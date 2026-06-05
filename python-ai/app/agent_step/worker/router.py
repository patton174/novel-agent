"""Internal worker HTTP routes."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Header, HTTPException

from app.agent_step.worker.run_worker import execute_worker_slice
from app.agent_step.worker.schemas import WorkerExecuteRequest, WorkerExecuteResponse
from app.config import settings
from app.core.llm import llm_provider

logger = logging.getLogger(__name__)

router = APIRouter()


def _verify_internal_key(key: str | None) -> None:
    expected = settings.internal_service_key
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="invalid internal service key")


@router.post("/worker/run/execute", response_model=WorkerExecuteResponse)
async def worker_run_execute(
    req: WorkerExecuteRequest,
    x_internal_service_key: str | None = Header(default=None, alias="X-Internal-Service-Key"),
) -> WorkerExecuteResponse:
    _verify_internal_key(x_internal_service_key)
    if not llm_provider.is_configured:
        raise HTTPException(status_code=503, detail="LLM not configured")
    logger.info(
        "worker execute run_id=%s action=%s worker_id=%s",
        req.run_id,
        req.action,
        req.worker_id,
    )
    return await execute_worker_slice(req)
