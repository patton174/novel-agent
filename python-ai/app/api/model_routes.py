"""/internal/model/test — 连通性测试（Java CRM 调）。"""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.core.llm import llm_provider

logger = logging.getLogger(__name__)

internal_router = APIRouter()


def _verify_internal_key(key: str | None) -> None:
    expected = settings.internal_service_key
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="invalid internal service key")


class ModelTestRequest(BaseModel):
    config: dict


@internal_router.post("/model/test")
async def test_model(
    body: ModelTestRequest,
    x_internal_service_key: str | None = Header(default=None, alias="X-Internal-Service-Key"),
):
    _verify_internal_key(x_internal_service_key)
    start = time.perf_counter()
    cfg = dict(body.config or {})
    if not cfg.get("api_key"):
        return {"ok": False, "error": "API Key 未配置"}
    if not str(cfg.get("base_url") or "").strip():
        return {"ok": False, "error": "API 地址未配置"}
    try:
        llm = llm_provider._create_llm(cfg)
        from langchain_core.messages import HumanMessage

        await llm.ainvoke([HumanMessage(content="ping")])
        latency_ms = int((time.perf_counter() - start) * 1000)
        return {"ok": True, "latencyMs": latency_ms}
    except Exception as e:
        logger.warning("model test failed: %s", e)
        latency_ms = int((time.perf_counter() - start) * 1000)
        return {"ok": False, "error": str(e), "latencyMs": latency_ms}
