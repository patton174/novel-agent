"""封面提示词 LLM 编排入口。"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator

from langchain_core.messages import HumanMessage, SystemMessage

from app.agent.harness.structured_llm import invoke_structured_with_retry
from app.core.llm import llm_provider
from app.core.llm_content import extract_llm_text
from app.services.cover.assembly import fallback_bundle, finalize_bundle
from app.services.cover.constants import SSE_CHUNK
from app.services.cover.context import resolve_context
from app.services.cover.messages import build_human_message
from app.services.cover.parse import parse_stream_document
from app.services.cover.schemas import CoverPromptRequest, CoverPromptResponse, CoverPromptSuggestion
from app.services.cover.spec import fanqie_llm_brief
from app.services.cover.templates import structured_system_prompt, stream_system_prompt

logger = logging.getLogger(__name__)


def format_sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _to_response(req: CoverPromptRequest, suggestion: CoverPromptSuggestion) -> CoverPromptResponse:
    archetype, category, mood, layout = resolve_context(req)
    style = suggestion.style_prompt
    scene = suggestion.scene_prompt
    if req.style_draft.strip() and req.mode == "optimize":
        style = req.style_draft
    return finalize_bundle(req, style, scene, archetype, category, mood, layout)


async def suggest_cover_prompt(req: CoverPromptRequest) -> CoverPromptResponse:
    fallback = fallback_bundle(req)
    if not llm_provider.is_configured:
        return fallback

    try:
        archetype, _, _, layout = resolve_context(req)
        suggestion = await invoke_structured_with_retry(
            [
                SystemMessage(content=f"{structured_system_prompt()}\n\n{fanqie_llm_brief(archetype, layout)}"),
                HumanMessage(content=build_human_message(req)),
            ],
            CoverPromptSuggestion,
            profile="fast",
            max_attempts=2,
        )
        bundle = _to_response(req, suggestion)
        logger.info(
            "cover prompt done layout=%s archetype=%s title=%s image=%s",
            layout,
            archetype,
            req.title,
            bundle.image_prompt[:240],
        )
        return bundle
    except Exception:
        logger.exception("cover structured prompt failed, trying raw invoke")
        try:
            llm = llm_provider.get_llm(profile="fast")
            result = await llm.ainvoke(
                [SystemMessage(content=stream_system_prompt()), HumanMessage(content=build_human_message(req))]
            )
            raw = extract_llm_text(getattr(result, "content", result), include_thinking=False)
            return parse_stream_document(raw, req)
        except Exception:
            logger.exception("cover prompt generation failed")
            return fallback


async def stream_cover_prompt(req: CoverPromptRequest) -> AsyncIterator[str]:
    archetype, category, mood, layout = resolve_context(req)
    yield format_sse({"type": "meta", "archetype": archetype, "layout": layout})

    bundle = await suggest_cover_prompt(req)

    for field, text in (("style", bundle.style_prompt), ("scene", bundle.scene_prompt)):
        for i in range(0, len(text), SSE_CHUNK):
            yield format_sse({"type": "delta", "field": field, "text": text[i : i + SSE_CHUNK]})
            await asyncio.sleep(0.006)

    yield format_sse(
        {
            "type": "done",
            "archetype": archetype,
            "layout": layout,
            "style_prompt": bundle.style_prompt,
            "scene_prompt": bundle.scene_prompt,
            "document": bundle.document,
            "image_prompt": bundle.image_prompt,
            "prompt": bundle.image_prompt,
        }
    )
    logger.info(
        "cover prompt sse done layout=%s archetype=%s title=%s image=%s",
        layout,
        archetype,
        req.title,
        bundle.image_prompt[:240],
    )
