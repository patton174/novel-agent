"""解析 LLM 流式 Markdown 输出。"""

from __future__ import annotations

import ast
import re

from app.core.llm_content import extract_llm_text
from app.services.cover.assembly import fallback_bundle, finalize_bundle
from app.services.cover.constants import SCENE_MAX, STYLE_MAX
from app.services.cover.context import clip, resolve_context
from app.services.cover.schemas import CoverPromptRequest, CoverPromptResponse
from app.services.cover.spec import default_scene_zh, default_style_en, infer_archetype, infer_layout_mode, normalize_style


def extract_section(md: str, header: str) -> str:
    pattern = rf"##\s*{re.escape(header)}\s*\n(.*?)(?=\n##\s|\Z)"
    match = re.search(pattern, md, re.DOTALL | re.IGNORECASE)
    if not match:
        return ""
    return clip(match.group(1).strip(), SCENE_MAX if "中文" in header else STYLE_MAX)


def coerce_block_list(raw: str) -> list | str:
    text = raw.strip()
    if not text.startswith("["):
        return raw
    try:
        parsed = ast.literal_eval(text)
        if isinstance(parsed, list):
            return parsed
    except (SyntaxError, ValueError):
        pass
    return raw


def parse_stream_document(md: str, req: CoverPromptRequest) -> CoverPromptResponse:
    archetype, category, mood, layout = resolve_context(req)
    raw = extract_llm_text(md, include_thinking=False)
    if raw.strip().startswith("[") and "'type'" in raw:
        raw = extract_llm_text(coerce_block_list(raw), include_thinking=False)
    style = extract_section(raw, "Style (English)") or extract_section(raw, "Style")
    scene = extract_section(raw, "Scene (中文)") or extract_section(raw, "Scene")
    if not style and not scene:
        return fallback_bundle(req)
    style = normalize_style_prompt(style or default_style_en(archetype, layout, category), category)
    return finalize_bundle(
        req,
        style,
        scene or default_scene_zh(layout, archetype, req.title, mood),
        archetype,
        category,
        mood,
        layout,
    )


def normalize_style_prompt(style: str, category: str) -> str:
    archetype = infer_archetype(category, "", "", "")
    layout = infer_layout_mode(category, "", "", "", archetype)
    return normalize_style(style, archetype, layout)


def normalize_scene_prompt(scene: str, title: str, category: str, mood: str) -> str:
    from app.services.cover.spec import normalize_scene

    archetype = infer_archetype(category, "", "", title)
    layout = infer_layout_mode(category, "", "", title, archetype)
    return normalize_scene(scene, title, archetype, layout, mood)
