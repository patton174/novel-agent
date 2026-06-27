"""测试与旧引用兼容的薄封装。"""

from __future__ import annotations

from app.services.cover.context import infer_category, infer_mood
from app.services.cover.parse import normalize_scene_prompt, normalize_style_prompt
from app.services.cover.spec import default_scene_zh, default_style_en


def legacy_default_style_en(category: str) -> str:
    return default_style_en("玄幻仙侠", "单人顶题", category)


def legacy_default_scene_zh(title: str, category: str, mood: str) -> str:
    return default_scene_zh("单人顶题", "玄幻仙侠", title, mood)


__all__ = [
    "infer_category",
    "infer_mood",
    "legacy_default_scene_zh",
    "legacy_default_style_en",
    "normalize_scene_prompt",
    "normalize_style_prompt",
]
