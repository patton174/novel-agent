"""番茄封面品类与构图规则（子模块聚合导出）。"""

from app.services.cover.spec.archetypes import ARCHETYPE_STYLE_EN, infer_archetype
from app.services.cover.spec.brief import fanqie_llm_brief
from app.services.cover.spec.defaults import default_scene_zh, default_style_en, title_clause
from app.services.cover.spec.layout_inference import infer_layout_mode, title_char_count
from app.services.cover.spec.layouts import LAYOUT_MODES
from app.services.cover.spec.normalize import (
    clean_llm_scene,
    enforce_layout_result,
    ensure_fanqie_title,
    normalize_scene,
    normalize_style,
    scene_matches_layout,
)

__all__ = [
    "ARCHETYPE_STYLE_EN",
    "LAYOUT_MODES",
    "clean_llm_scene",
    "default_scene_zh",
    "default_style_en",
    "enforce_layout_result",
    "ensure_fanqie_title",
    "fanqie_llm_brief",
    "infer_archetype",
    "infer_layout_mode",
    "normalize_scene",
    "normalize_style",
    "scene_matches_layout",
    "title_char_count",
    "title_clause",
]
