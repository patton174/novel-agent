"""构造发给 LLM 的 human message。"""

from __future__ import annotations

from app.services.cover.context import infer_category, infer_mood, resolve_context
from app.services.cover.schemas import CoverPromptRequest
from app.services.cover.spec import fanqie_llm_brief


def metadata_block(req: CoverPromptRequest, archetype: str, layout: str) -> str:
    return "\n".join(
        [
            f"书名：{req.title.strip() or '未命名'}",
            f"品类：{infer_category(req.genre, req.style)}",
            f"封面模板：{archetype}",
            f"构图版式：{layout}",
            f"叙事风格：{req.style.strip() or '—'}",
            f"简介/情绪：{infer_mood(req.description)}",
            "",
            fanqie_llm_brief(archetype, layout),
        ]
    )


def build_human_message(req: CoverPromptRequest) -> str:
    archetype, _, _, layout = resolve_context(req)
    parts = ["【小说信息】", metadata_block(req, archetype, layout)]
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
