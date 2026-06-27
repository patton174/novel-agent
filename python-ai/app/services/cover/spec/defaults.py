"""无 LLM 时的默认 style/scene 片段。"""

from __future__ import annotations

from app.services.cover.spec.archetypes import ARCHETYPE_STYLE_EN
from app.services.cover.spec.layouts import LAYOUT_MODES


def title_clause(layout: str, book: str) -> str:
    if layout == "双人底题":
        return f"画面下方三分之一超大粗体渐变发光主标题《{book}》，其下小字作者名"
    if layout == "景观书法":
        return f"画面居中巨大书法主标题《{book}》，右上红色竖排印章式作者名"
    if layout == "字压意境":
        return f"画面上半书法泼墨巨字主标题《{book}》，占画面40%以上，作者名居中偏下"
    return f"画面上方三分之一超大立体描金主标题《{book}》"


def default_scene_zh(layout: str, archetype: str, title: str, mood: str) -> str:
    book = title.strip() or "未命名"
    mood_part = mood.strip() or "情绪浓烈"
    spec = LAYOUT_MODES[layout]
    title_part = title_clause(layout, book)

    if layout == "景观书法":
        body = (
            f"竖版9:16，{spec['composition']}，{mood_part}，"
            f"冷色雾霭山水云海，水墨数字绘混合，"
        )
    elif layout == "字压意境":
        body = (
            f"竖版9:16，{spec['composition']}，{mood_part}，"
            f"暗灰低饱和环境，血红强调色，废墟微粒逆光，"
        )
    elif layout == "双人底题":
        body = (
            f"竖版9:16，{spec['composition']}，{mood_part}，"
            f"半写实数字绘画质感，都市夜景 bokeh，橙金粒子点缀，"
        )
    else:
        body = (
            f"竖版9:16，{spec['composition']}，{mood_part}，"
            f"3D半写实海报质感，深色虚化背景，强轮廓光粒子，"
        )
    return f"{body}{title_part}，番茄小说封面高对比"


def default_style_en(archetype: str, layout: str, category: str) -> str:
    base = ARCHETYPE_STYLE_EN.get(archetype, ARCHETYPE_STYLE_EN["玄幻仙侠"])
    layout_tags = {
        "字压意境": "dramatic one-point perspective, brush calligraphy title, cinematic backlight",
        "景观书法": "ethereal landscape, ink mist, centered calligraphy",
        "双人底题": "couple portrait, bokeh night city, bottom title layout",
        "单人顶题": "3d render, photorealistic CG, half-body portrait, top title layout",
    }
    extra = f"{layout_tags.get(layout, '')}, {category.replace('、', ' ')}".strip(", ")
    return f"{base}, {extra}" if extra else base
