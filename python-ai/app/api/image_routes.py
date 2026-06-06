"""Image generation API (Agnes via python-ai, consumed by Java services)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.agnes_image import AgnesImageError, is_configured, image_to_image, text_to_image

router = APIRouter(prefix="/images", tags=["Images"])


class TextToImageRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    size: str = Field(..., min_length=3, pattern=r"^\d+x\d+$")
    return_base64: bool = False


class ImageToImageRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    size: str = Field(..., min_length=3, pattern=r"^\d+x\d+$")
    images: list[str] = Field(..., min_length=1)
    return_base64: bool = False


class GeneratedImageResponse(BaseModel):
    ok: bool = True
    url: str | None = None
    b64_json: str | None = None


class ImageStatusResponse(BaseModel):
    enabled: bool


@router.get("/status", response_model=ImageStatusResponse)
async def image_status():
    return ImageStatusResponse(enabled=is_configured())


@router.post("/text-to-image", response_model=GeneratedImageResponse)
async def generate_text_to_image(body: TextToImageRequest):
    try:
        result = await text_to_image(
            body.prompt,
            body.size,
            return_base64=body.return_base64,
        )
    except AgnesImageError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return GeneratedImageResponse(url=result.get("url"), b64_json=result.get("b64_json"))


@router.post("/image-to-image", response_model=GeneratedImageResponse)
async def generate_image_to_image(body: ImageToImageRequest):
    try:
        result = await image_to_image(
            body.prompt,
            body.size,
            body.images,
            return_base64=body.return_base64,
        )
    except AgnesImageError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return GeneratedImageResponse(url=result.get("url"), b64_json=result.get("b64_json"))
