"""LLM-assisted book cover prompts — 番茄流量封面品类模板 + style/scene 双字段。"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from collections.abc import AsyncIterator
from typing import Literal

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.agent.harness.structured_llm import invoke_structured_with_retry
from app.core.llm import llm_provider
from app.core.llm_content import extract_llm_text
from app.services.fanqie_cover_spec import (
    default_scene_zh,
    default_style_en,
    enforce_layout_result,
    fanqie_llm_brief,
    infer_archetype,
    infer_layout_mode,
)

logger = logging.getLogger(__name__)

_SSE_CHUNK = 16

_STYLE_MAX = 600
_SCENE_MAX = 1200
_DOCUMENT_MAX = 4000

_ROLE_MD = (
    "你是番茄免费小说流量封面设计专家，熟悉各品类封面的构图、标题区与光效套路，"
    "能把小说信息转成 AI 绘画模型可执行的视觉指令。"
)

_STRUCTURED_SYSTEM = f"""根据小说信息生成封面绘画两段提示词。

{_ROLE_MD}

输出要求：
1. style_prompt：纯英文逗号分隔；符合给定构图版式；禁止 anime/manga/2d/pop art。
2. scene_prompt：中文逗号分隔，一行写完；按版式写构图/人物/背景/标题位置；禁止【背景】分段标记；禁止偏离给定版式（甜宠必须有男女主半身，禁止无人物景观封）。

只输出结构化字段，不要解释。"""

_STREAM_SYSTEM = f"""{_ROLE_MD}

输出 Markdown（不要 JSON、代码块、thinking）：

# 封面绘画提示词

## Role
（一句话）

## Style (English)
（纯英文逗号分隔 SD 标签）

## Scene (中文)
（中文逗号分隔；务必写明：半身构图、背景、光效、画面上方三分之一主标题《书名》）

禁止其它章节。"""


class CoverPromptRequest(BaseModel):
    title: str = Field(default="", max_length=200)
    genre: str = Field(default="", max_length=100)
    style: str = Field(default="", max_length=100)
    description: str = Field(default="", max_length=500)
    draft: str = Field(default="", max_length=800)
    style_draft: str = Field(default="", max_length=600)
    scene_draft: str = Field(default="", max_length=1200)
    mode: Literal["generate", "optimize"] = "generate"


class CoverPromptSuggestion(BaseModel):
    style_prompt: str = Field(description="English SD tags, 3D semi-realistic CG poster. No Chinese.")
    scene_prompt: str = Field(
        description="Chinese scene: half-body layout, dark bg, top-third gold title 标题为《title》, lighting."
    )


class CoverPromptResponse(BaseModel):
    style_prompt: str = ""
    scene_prompt: str = ""
    document: str = ""
    image_prompt: str = ""
    prompt: str = ""


def _infer_category(genre: str, style: str) -> str:
    parts = [p.strip() for p in (genre, style) if p and p.strip()]
    return "、".join(parts) if parts else "网文"


def _infer_scene(description: str) -> str:
    desc = (description or "").strip()
    if not desc:
        return "强情绪、高辨识度"
    return desc[:120] if len(desc) > 120 else desc


def _clip(text: str, max_len: int) -> str:
    cleaned = re.sub(r"[\r\n\t]+", " ", (text or "").strip())
    cleaned = re.sub(r"\s+", " ", cleaned)
    if len(cleaned) > max_len:
        return cleaned[:max_len].rstrip(" ,，")
    return cleaned


def _resolve_context(req: CoverPromptRequest) -> tuple[str, str, str, str]:
    archetype = infer_archetype(req.genre, req.style, req.description, req.title)
    layout = infer_layout_mode(req.genre, req.style, req.description, req.title, archetype)
    category = _infer_category(req.genre, req.style)
    mood = _infer_scene(req.description)
    return archetype, category, mood, layout


def build_image_prompt(style_prompt: str, scene_prompt: str) -> str:
    style = _clip(style_prompt, _STYLE_MAX).rstrip(", ")
    scene = _clip(scene_prompt, _SCENE_MAX).rstrip("，, ")
    if style and scene:
        return f"{style}, {scene}"
    return style or scene


def format_sse(payload: dict) -> str:
    """标准 SSE：text/event-stream 帧。"""
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _finalize_bundle(
    req: CoverPromptRequest,
    style: str,
    scene: str,
    archetype: str,
    category: str,
    mood: str,
    layout: str,
) -> CoverPromptResponse:
    style, scene = enforce_layout_result(style, scene, layout, archetype, req.title, mood, category)
    image = build_image_prompt(style, scene)
    doc = build_document(req, style, scene, archetype, layout)
    return CoverPromptResponse(
        style_prompt=style,
        scene_prompt=scene,
        document=doc,
        image_prompt=image,
        prompt=image,
    )


def build_document(
    req: CoverPromptRequest,
    style_prompt: str,
    scene_prompt: str,
    archetype: str,
    layout: str,
) -> str:
    title = req.title.strip() or "未命名"
    category = _infer_category(req.genre, req.style)
    mood = _infer_scene(req.description)
    brief = fanqie_llm_brief(archetype, layout)
    return (
        f"# 封面绘画提示词\n\n"
        f"## Role\n{_ROLE_MD}\n\n"
        f"## Novel\n"
        f"- 书名：{title}\n"
        f"- 品类：{category}\n"
        f"- 封面模板：{archetype}\n"
        f"- 构图版式：{layout}\n"
        f"- 情绪/卖点：{mood}\n\n"
        f"## 番茄铁律\n{brief}\n\n"
        f"## Style (English)\n{style_prompt.strip()}\n\n"
        f"## Scene (中文)\n{scene_prompt.strip()}\n"
    )[:_DOCUMENT_MAX]


def _fallback_bundle(req: CoverPromptRequest) -> CoverPromptResponse:
    archetype, category, mood, layout = _resolve_context(req)
    style = _clip(req.style_draft, _STYLE_MAX) or default_style_en(archetype, layout, category)
    scene = (
        _clip(req.scene_draft or req.draft, _SCENE_MAX)
        or default_scene_zh(layout, archetype, req.title, mood)
    )
    return _finalize_bundle(req, style, scene, archetype, category, mood, layout)


def _extract_section(md: str, header: str) -> str:
    pattern = rf"##\s*{re.escape(header)}\s*\n(.*?)(?=\n##\s|\Z)"
    match = re.search(pattern, md, re.DOTALL | re.IGNORECASE)
    if not match:
        return ""
    return _clip(match.group(1).strip(), _SCENE_MAX if "中文" in header else _STYLE_MAX)


def _parse_stream_document(md: str, req: CoverPromptRequest) -> CoverPromptResponse:
    archetype, category, mood, layout = _resolve_context(req)
    raw = extract_llm_text(md, include_thinking=False)
    if raw.strip().startswith("[") and "'type'" in raw:
        raw = extract_llm_text(_coerce_block_list(raw), include_thinking=False)
    style = _extract_section(raw, "Style (English)") or _extract_section(raw, "Style")
    scene = _extract_section(raw, "Scene (中文)") or _extract_section(raw, "Scene")
    if not style and not scene:
        return _fallback_bundle(req)
    style = _normalize_style_prompt(style or default_style_en(archetype, layout, category), category)
    return _finalize_bundle(
        req,
        style,
        scene or default_scene_zh(layout, archetype, req.title, mood),
        archetype,
        category,
        mood,
        layout,
    )


def _coerce_block_list(raw: str) -> list | str:
    text = raw.strip()
    if not text.startswith("["):
        return raw
    try:
        import ast

        parsed = ast.literal_eval(text)
        if isinstance(parsed, list):
            return parsed
    except (SyntaxError, ValueError):
        pass
    return raw


def _metadata_block(req: CoverPromptRequest, archetype: str, layout: str) -> str:
    return "\n".join(
        [
            f"书名：{req.title.strip() or '未命名'}",
            f"品类：{_infer_category(req.genre, req.style)}",
            f"封面模板：{archetype}",
            f"构图版式：{layout}",
            f"叙事风格：{req.style.strip() or '—'}",
            f"简介/情绪：{_infer_scene(req.description)}",
            "",
            fanqie_llm_brief(archetype, layout),
        ]
    )


def _human_message(req: CoverPromptRequest) -> str:
    archetype, _, _, layout = _resolve_context(req)
    parts = ["【小说信息】", _metadata_block(req, archetype, layout)]
    style_d = req.style_draft.strip()
    scene_d = (req.scene_draft or req.draft).strip()
    if req.mode == "optimize" and (style_d or scene_d):
        parts.extend(["", "【用户草稿，按番茄铁律优化】"])
        if style_d:
            parts.append(f"Style draft: {style_d}")
        if scene_d:
            parts.append(f"Scene draft: {scene_d}")
    elif scene_d:
        parts.extend(["", "【用户场景草稿】", scene_d])
    return "\n".join(parts)


def _to_response(req: CoverPromptRequest, suggestion: CoverPromptSuggestion) -> CoverPromptResponse:
    archetype, category, mood, layout = _resolve_context(req)
    style = suggestion.style_prompt
    scene = suggestion.scene_prompt
    if req.style_draft.strip() and req.mode == "optimize":
        style = req.style_draft
    return _finalize_bundle(req, style, scene, archetype, category, mood, layout)


# 测试与旧引用兼容
def _default_style_en(category: str) -> str:
    return default_style_en("玄幻仙侠", "单人顶题", category)


def _default_scene_zh(title: str, category: str, mood: str) -> str:
    return default_scene_zh("单人顶题", "玄幻仙侠", title, mood)


def _normalize_style_prompt(style: str, category: str) -> str:
    from app.services.fanqie_cover_spec import normalize_style

    archetype = infer_archetype(category, "", "", "")
    layout = infer_layout_mode(category, "", "", "", archetype)
    return normalize_style(style, archetype, layout)


def _normalize_scene_prompt(scene: str, title: str, category: str, mood: str) -> str:
    from app.services.fanqie_cover_spec import normalize_scene

    archetype = infer_archetype(category, "", "", title)
    layout = infer_layout_mode(category, "", "", title, archetype)
    return normalize_scene(scene, title, archetype, layout, mood)


async def suggest_cover_prompt(req: CoverPromptRequest) -> CoverPromptResponse:
    fallback = _fallback_bundle(req)
    if not llm_provider.is_configured:
        return fallback

    try:
        archetype, _, _, layout = _resolve_context(req)
        suggestion = await invoke_structured_with_retry(
            [
                SystemMessage(content=f"{_STRUCTURED_SYSTEM}\n\n{fanqie_llm_brief(archetype, layout)}"),
                HumanMessage(content=_human_message(req)),
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
                [SystemMessage(content=_STREAM_SYSTEM), HumanMessage(content=_human_message(req))]
            )
            raw = extract_llm_text(getattr(result, "content", result), include_thinking=False)
            return _parse_stream_document(raw, req)
        except Exception:
            logger.exception("cover prompt generation failed")
            return fallback


async def stream_cover_prompt(req: CoverPromptRequest) -> AsyncIterator[str]:
    """标准 SSE（text/event-stream）：meta → 分片 delta → done。"""

    archetype, category, mood, layout = _resolve_context(req)
    yield format_sse({"type": "meta", "archetype": archetype, "layout": layout})

    bundle = await suggest_cover_prompt(req)

    for field, text in (("style", bundle.style_prompt), ("scene", bundle.scene_prompt)):
        for i in range(0, len(text), _SSE_CHUNK):
            yield format_sse({"type": "delta", "field": field, "text": text[i : i + _SSE_CHUNK]})
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
