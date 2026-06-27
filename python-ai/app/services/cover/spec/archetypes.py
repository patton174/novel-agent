"""封面品类模板与推断。"""

from __future__ import annotations

ARCHETYPE_STYLE_EN: dict[str, str] = {
    "甜宠言情": (
        "semi-realistic digital painting, manhua-plus illustration, romantic cinematic lighting, "
        "rim light, bokeh city night, high contrast, vertical 9:16, fanqie romance novel cover"
    ),
    "都市爽文": (
        "cinematic digital painting, dramatic perspective, volumetric backlight, "
        "high contrast, muted tones with red accent, vertical 9:16, fanqie urban novel cover"
    ),
    "玄幻仙侠": (
        "epic fantasy digital painting, ethereal mist, ink wash meets CG, "
        "cool blue white palette, vertical 9:16, fanqie xianxia novel cover"
    ),
    "古言宫斗": (
        "ancient Chinese digital painting, luxury fabric, golden rim light, "
        "high contrast, vertical 9:16, fanqie historical romance cover"
    ),
    "悬疑惊悚": (
        "moody cinematic digital painting, fog, silhouette, cold tone, "
        "high contrast, vertical 9:16, fanqie thriller novel cover"
    ),
}

_ARCHETYPE_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("甜宠言情", ("甜宠", "言情", "恋爱", "女友", "男友", "总裁", "娇妻", "宠溺", "暗恋", "精神小妹", "甜虐", "豪门")),
    ("都市爽文", ("都市", "战神", "逆袭", "打脸", "重生", "神豪", "赘婿", "兵王", "系统", "爽文", "异能", "戏神")),
    ("古言宫斗", ("古言", "宫斗", "王妃", "皇后", "嫡女", "穿越古代", "后宫", "侯门")),
    ("悬疑惊悚", ("悬疑", "惊悚", "恐怖", "推理", "刑侦", "密室", "诡", "规则怪谈")),
    ("玄幻仙侠", ("玄幻", "仙侠", "修仙", "修真", "灵气", "宗门", "渡劫", "飞升", "渊", "仙")),
]


def infer_archetype(genre: str, style: str, description: str, title: str) -> str:
    blob = f"{genre}{style}{description}{title}"
    for name, keys in _ARCHETYPE_KEYWORDS:
        if any(k in blob for k in keys):
            return name
    return "玄幻仙侠"
