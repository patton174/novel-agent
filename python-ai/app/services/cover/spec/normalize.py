"""LLM 输出清洗与版式约束。"""

from __future__ import annotations

import re

from app.services.cover.spec.defaults import default_scene_zh, default_style_en, title_clause
from app.services.cover.spec.layouts import LAYOUT_MODES

_BAD_STYLE = re.compile(
    r"\b(anime\s*style|anime|manga-inspired|manga|pop\s*art|cartoon|flat\s*vector)\b",
    re.I,
)

_BAD_TITLE_PLACEMENT = re.compile(
    r"画面右侧[^，。]*标题|标题[^，。]*画面右侧|右侧留白[^，。]*标题",
)

_LANDSCAPE_WRONG_FOR_COUPLE = (
    "无人物",
    "景观书法",
    "深渊意境",
    "山水云海",
    "水墨笔触",
    "山峦与城",
    "镜像景观",
)


def clean_llm_scene(scene: str) -> str:
    cleaned = re.sub(r"【[^】]+】", "", scene or "")
    return re.sub(r"\s+", " ", cleaned).strip(" ，,")


def scene_matches_layout(scene: str, layout: str, title: str) -> bool:
    from app.services.cover.spec.layout_inference import title_char_count

    if layout == "双人底题":
        if any(m in scene for m in _LANDSCAPE_WRONG_FOR_COUPLE):
            return False
        if title_char_count(title) > 4 and "景观" in scene and "男女" not in scene:
            return False
    if layout == "景观书法" and title_char_count(title) > 4:
        return False
    return True


def ensure_fanqie_title(scene: str, title: str, layout: str) -> str:
    book = title.strip() or "未命名"
    cleaned = _BAD_TITLE_PLACEMENT.sub("", scene)
    cleaned = re.sub(r"标题文字为《[^》]+》[^，。]*", "", cleaned)
    cleaned = re.sub(r"主标题《[^》]+》[^，。]*", "", cleaned)
    cleaned = re.sub(r"[，,]{2,}", "，", cleaned).strip("，, ")
    clause = title_clause(layout, book)
    if f"《{book}》" in cleaned and any(
        k in cleaned for k in ("上方", "下方", "居中", "上半", "书法")
    ):
        return cleaned
    return f"{cleaned}，{clause}" if cleaned else clause


def normalize_style(style: str, archetype: str, layout: str) -> str:
    cleaned = re.sub(r"\s+", " ", (style or "").strip())
    if not cleaned or _BAD_STYLE.search(cleaned):
        return default_style_en(archetype, layout, "")
    lowered = cleaned.lower()
    if layout == "单人顶题" and "3d" not in lowered and "photorealistic" not in lowered:
        cleaned = f"3d render, photorealistic, {cleaned}"
    if "vertical" not in lowered and "9:16" not in lowered:
        cleaned = f"{cleaned}, vertical 9:16"
    if "fanqie" not in lowered:
        cleaned = f"{cleaned}, fanqie web novel cover"
    return cleaned


def normalize_scene(scene: str, title: str, archetype: str, layout: str, mood: str) -> str:
    cleaned = re.sub(r"\s+", " ", (scene or "").strip())
    if not cleaned:
        cleaned = default_scene_zh(layout, archetype, title, mood)

    if "9:16" not in cleaned and "竖版" not in cleaned:
        cleaned = f"竖版9:16，{cleaned}"

    if layout not in ("景观书法", "字压意境"):
        if "半身" not in cleaned and "双人" not in cleaned and "特写" not in cleaned:
            if layout == "双人底题":
                cleaned = f"男女主半身亲密构图，{cleaned}"
            else:
                cleaned = f"人物半身特写，{cleaned}"

    return ensure_fanqie_title(cleaned, title, layout)


def enforce_layout_result(
    style: str,
    scene: str,
    layout: str,
    archetype: str,
    title: str,
    mood: str,
    category: str,
) -> tuple[str, str]:
    scene = clean_llm_scene(scene)
    if not scene_matches_layout(scene, layout, title):
        scene = default_scene_zh(layout, archetype, title, mood)
        style = default_style_en(archetype, layout, category)
    else:
        style = normalize_style(style, archetype, layout)
        scene = normalize_scene(scene, title, archetype, layout, mood)
    return style, scene
