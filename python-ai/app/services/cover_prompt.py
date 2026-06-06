"""LLM-assisted book cover image prompts."""

from __future__ import annotations

import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.core.llm import llm_provider

logger = logging.getLogger(__name__)

_PROMPT_MAX_LEN = 1200


class CoverPromptRequest(BaseModel):
    title: str = Field(default="", max_length=200)
    genre: str = Field(default="", max_length=100)
    style: str = Field(default="", max_length=100)
    description: str = Field(default="", max_length=500)
    draft: str = Field(default="", max_length=800)


class CoverPromptResponse(BaseModel):
    prompt: str


def _fallback_prompt(req: CoverPromptRequest) -> str:
    parts = [
        "Professional vertical book cover illustration",
        f'for a novel titled "{req.title.strip()}"' if req.title.strip() else "",
    ]
    if req.genre.strip():
        parts.append(f"genre: {req.genre.strip()}")
    if req.style.strip():
        parts.append(f"style: {req.style.strip()}")
    if req.description.strip():
        desc = req.description.strip()
        if len(desc) > 200:
            desc = desc[:200]
        parts.append(f"theme: {desc}")
    parts.append(
        "cinematic lighting, rich colors, no text overlay, no watermark, high quality cover art"
    )
    return ", ".join(p for p in parts if p)


def _normalize_prompt(raw: str, fallback: str) -> str:
    text = re.sub(r"[\r\n\t]+", " ", (raw or "").strip())
    text = re.sub(r"\s+", " ", text)
    text = text.strip("\"'“”‘’")
    if not text:
        return fallback
    if len(text) > _PROMPT_MAX_LEN:
        return text[:_PROMPT_MAX_LEN].rstrip()
    return text


async def suggest_cover_prompt(req: CoverPromptRequest) -> CoverPromptResponse:
    fallback = _fallback_prompt(req)
    draft = (req.draft or "").strip()

    if not llm_provider.is_configured:
        return CoverPromptResponse(prompt=draft or fallback)

    if draft:
        system = SystemMessage(
            content=(
                "You refine prompts for AI book cover image generation. "
                "Given novel metadata and the user's draft (possibly incomplete), "
                "output ONE English prompt: vivid scene/composition, lighting, mood, "
                "vertical book cover, no text/watermark/logos. "
                "Keep under 120 words. Output prompt only."
            )
        )
        human = HumanMessage(
            content="\n".join(
                [
                    f"Title: {req.title or '—'}",
                    f"Genre: {req.genre or '—'}",
                    f"Style: {req.style or '—'}",
                    f"Description: {(req.description or '—')[:300]}",
                    f"User draft: {draft}",
                ]
            )
        )
    else:
        system = SystemMessage(
            content=(
                "You write prompts for AI book cover image generation from novel metadata. "
                "Output ONE English prompt: main subject, environment, lighting, mood, "
                "vertical composition, cinematic, no text/watermark. "
                "Keep under 120 words. Output prompt only."
            )
        )
        human = HumanMessage(
            content="\n".join(
                [
                    f"Title: {req.title or 'Untitled'}",
                    f"Genre: {req.genre or '—'}",
                    f"Style: {req.style or '—'}",
                    f"Description: {(req.description or '—')[:400]}",
                ]
            )
        )

    try:
        llm = llm_provider.get_llm(profile="fast")
        result = await llm.ainvoke([system, human])
        raw = result.content if isinstance(result.content, str) else str(result.content)
        return CoverPromptResponse(prompt=_normalize_prompt(raw, draft or fallback))
    except Exception:
        logger.exception("cover prompt generation failed")
        return CoverPromptResponse(prompt=draft or fallback)
