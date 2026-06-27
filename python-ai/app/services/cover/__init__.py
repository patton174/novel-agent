"""番茄流量封面提示词 — 模块化入口。"""

from app.services.cover.assembly import (
    build_document,
    build_image_prompt,
    fallback_bundle,
    finalize_bundle,
)
from app.services.cover.compat import (
    legacy_default_scene_zh as _default_scene_zh,
    legacy_default_style_en as _default_style_en,
    infer_category as _infer_category,
    normalize_scene_prompt as _normalize_scene_prompt,
    normalize_style_prompt as _normalize_style_prompt,
)
from app.services.cover.constants import DOCUMENT_MAX, SCENE_MAX, SSE_CHUNK, STYLE_MAX
from app.services.cover.context import clip, infer_category, infer_mood, resolve_context
from app.services.cover.parse import parse_stream_document as _parse_stream_document
from app.services.cover.schemas import CoverPromptRequest, CoverPromptResponse, CoverPromptSuggestion
from app.services.cover.service import format_sse, stream_cover_prompt, suggest_cover_prompt

__all__ = [
    "CoverPromptRequest",
    "CoverPromptResponse",
    "CoverPromptSuggestion",
    "DOCUMENT_MAX",
    "SCENE_MAX",
    "SSE_CHUNK",
    "STYLE_MAX",
    "_default_scene_zh",
    "_default_style_en",
    "_fallback_bundle",
    "_infer_category",
    "_normalize_scene_prompt",
    "_normalize_style_prompt",
    "_parse_stream_document",
    "build_document",
    "build_image_prompt",
    "clip",
    "fallback_bundle",
    "format_sse",
    "infer_category",
    "infer_mood",
    "resolve_context",
    "stream_cover_prompt",
    "suggest_cover_prompt",
]

# 测试沿用旧私有名
_fallback_bundle = fallback_bundle
