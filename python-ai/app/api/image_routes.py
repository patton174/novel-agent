"""Image generation API (Agnes via python-ai, consumed by Java services)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.agnes_image import AgnesImageError, image_to_image, is_configured, text_to_image
from app.services.cover_prompt import CoverPromptRequest, CoverPromptResponse, suggest_cover_prompt

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


@router.post("/cover-prompt", response_model=CoverPromptResponse)
async def generate_cover_prompt(body: CoverPromptRequest):
    return await suggest_cover_prompt(body)


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
