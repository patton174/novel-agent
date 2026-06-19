"""/internal/parse 路由。Java 传 multipart 字节流。"""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile

from app.config import settings
from app.parse.dispatcher import dispatch
from app.parse.models import ParseResult

logger = logging.getLogger(__name__)

internal_router = APIRouter()


def _verify_internal_key(key: str | None) -> None:
    expected = settings.internal_service_key
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="invalid internal service key")


@internal_router.post("/parse")
async def parse_file(
    file: UploadFile = File(...),
    format: str = Form(...),
    originalName: str = Form(...),
    fileId: str = Form(...),
    x_internal_service_key: str | None = Header(default=None, alias="X-Internal-Service-Key"),
):
    _verify_internal_key(x_internal_service_key)
    raw = await file.read()
    result: ParseResult = dispatch(fileId, raw, format, originalName)
    resp = result.model_dump()
    if result.error:
        # 错误仍返回 200 + error 字段，Java 侧据此置 failed
        return resp
    return resp
