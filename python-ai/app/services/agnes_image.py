"""Agnes-Image-2.0-Flash client (OpenAI-compatible Images API)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class AgnesImageError(Exception):
    """Raised when Agnes image generation fails."""


def is_configured() -> bool:
    return bool(settings.agnes_image_api_key.strip())


def _endpoint() -> str:
    base = settings.agnes_image_base_url.rstrip("/")
    return f"{base}/v1/images/generations"


async def text_to_image(
    prompt: str,
    size: str,
    *,
    return_base64: bool = False,
) -> dict[str, str | None]:
    if not is_configured():
        raise AgnesImageError("AGNES_IMAGE_API_KEY 未配置")

    body: dict[str, Any] = {
        "model": settings.agnes_image_model,
        "prompt": prompt,
        "size": size,
    }
    if return_base64:
        body["return_base64"] = True
    else:
        body["extra_body"] = {"response_format": "url"}

    return await _post_generate(body)


async def image_to_image(
    prompt: str,
    size: str,
    images: list[str],
    *,
    return_base64: bool = False,
) -> dict[str, str | None]:
    if not is_configured():
        raise AgnesImageError("AGNES_IMAGE_API_KEY 未配置")
    if not images:
        raise AgnesImageError("图生图需要至少一张输入图片")

    body: dict[str, Any] = {
        "model": settings.agnes_image_model,
        "prompt": prompt,
        "size": size,
        "image": images,
        "extra_body": {
            "response_format": "b64_json" if return_base64 else "url",
        },
    }
    return await _post_generate(body)


async def _post_generate(body: dict[str, Any]) -> dict[str, str | None]:
    timeout = httpx.Timeout(
        connect=30.0,
        read=float(max(30, settings.agnes_image_timeout)),
        write=30.0,
        pool=30.0,
    )
    headers = {
        "Authorization": f"Bearer {settings.agnes_image_api_key}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(_endpoint(), json=body, headers=headers)
    except httpx.HTTPError as exc:
        logger.warning("Agnes 生图请求异常: %s", exc)
        raise AgnesImageError("图像生成请求失败") from exc

    if response.status_code < 200 or response.status_code >= 300:
        logger.warning(
            "Agnes 生图失败 status=%s body=%s",
            response.status_code,
            response.text[:500],
        )
        raise AgnesImageError("图像生成失败")

    payload = response.json()
    data = payload.get("data") or []
    if not data:
        raise AgnesImageError("图像生成响应为空")

    first = data[0]
    url = first.get("url") or None
    b64 = first.get("b64_json") or None
    if not url and not b64:
        raise AgnesImageError("图像生成响应无 url/b64_json")
    return {"url": url, "b64_json": b64}
