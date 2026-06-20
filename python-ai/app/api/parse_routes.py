"""/internal/parse 路由。Java 传 multipart 字节流。

异步：立即返回 202，解析在后台线程执行（BackgroundTasks），实时写 Redis 进度，
完成后回调 Java /internal/upload/{fileId}/finalize 交付结果。Java 不再同步阻塞等待。
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, File, Form, Header, HTTPException, UploadFile

from app.config import settings
from app.parse.dispatcher import run_parse

logger = logging.getLogger(__name__)

internal_router = APIRouter()


def _verify_internal_key(key: str | None) -> None:
    expected = settings.internal_service_key
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="invalid internal service key")


@internal_router.post("/parse")
async def parse_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    format: str = Form(...),
    originalName: str = Form(...),
    fileId: str = Form(...),
    x_internal_service_key: str | None = Header(default=None, alias="X-Internal-Service-Key"),
):
    _verify_internal_key(x_internal_service_key)
    raw = await file.read()
    # 后台线程解析（sync 函数由 Starlette 线程池执行，不阻塞事件循环）。
    # 进度实时写 Redis，结果由 run_parse 回调 Java finalize 端点。
    background_tasks.add_task(run_parse, fileId, raw, format, originalName)
    return {"accepted": True, "fileId": fileId}
