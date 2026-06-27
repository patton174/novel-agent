"""组装最终 image_prompt 与 Markdown 文档。"""

from __future__ import annotations

from app.services.cover.constants import DOCUMENT_MAX, SCENE_MAX, STYLE_MAX
from app.services.cover.context import clip, infer_category, infer_mood
from app.services.cover.schemas import CoverPromptRequest, CoverPromptResponse
from app.services.cover.spec import (
    default_scene_zh,
    default_style_en,
    enforce_layout_result,
    fanqie_llm_brief,
)
from app.services.cover.templates import role_text


def build_image_prompt(style_prompt: str, scene_prompt: str) -> str:
    style = clip(style_prompt, STYLE_MAX).rstrip(", ")
    scene = clip(scene_prompt, SCENE_MAX).rstrip("，, ")
    if style and scene:
        return f"{style}, {scene}"
    return style or scene


def build_document(
    req: CoverPromptRequest,
    style_prompt: str,
    scene_prompt: str,
    archetype: str,
    layout: str,
) -> str:
    title = req.title.strip() or "未命名"
    category = infer_category(req.genre, req.style)
    mood = infer_mood(req.description)
    brief = fanqie_llm_brief(archetype, layout)
    return (
        f"# 封面绘画提示词\n\n"
        f"## Role\n{role_text()}\n\n"
        f"## Novel\n"
        f"- 书名：{title}\n"
        f"- 品类：{category}\n"
        f"- 封面模板：{archetype}\n"
        f"- 构图版式：{layout}\n"
        f"- 情绪/卖点：{mood}\n\n"
        f"## 番茄铁律\n{brief}\n\n"
        f"## Style (English)\n{style_prompt.strip()}\n\n"
        f"## Scene (中文)\n{scene_prompt.strip()}\n"
    )[:DOCUMENT_MAX]


def finalize_bundle(
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


def fallback_bundle(req: CoverPromptRequest) -> CoverPromptResponse:
    from app.services.cover.context import resolve_context

    archetype, category, mood, layout = resolve_context(req)
    style = clip(req.style_draft, STYLE_MAX) or default_style_en(archetype, layout, category)
    scene = (
        clip(req.scene_draft or req.draft, SCENE_MAX)
        or default_scene_zh(layout, archetype, req.title, mood)
    )
    return finalize_bundle(req, style, scene, archetype, category, mood, layout)
