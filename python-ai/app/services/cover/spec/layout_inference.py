"""按品类与内容推断构图版式。"""

from __future__ import annotations

import re

from app.services.cover.spec.archetypes import infer_archetype

_LAYOUT_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("字压意境", ("戏神", "规则怪谈", "悬疑", "惊悚", "异能", "末世", "废墟")),
    ("景观书法", ("天渊", "仙山", "九天", "仙界", "渡劫飞升")),
    ("双人底题", ("总裁", "豪门", "官途", "精神小妹")),
]


def title_char_count(title: str) -> int:
    return len(re.sub(r"[《》！!?？\s…]", "", title.strip()))


def infer_layout_mode(genre: str, style: str, description: str, title: str, archetype: str) -> str:
    """甜宠优先双人底题；禁止单字关键词误伤。"""
    if archetype == "甜宠言情":
        return "双人底题"

    blob = f"{genre}{style}{description}{title}"
    title_len = title_char_count(title)

    for layout, keys in _LAYOUT_KEYWORDS:
        if layout == "景观书法" and title_len > 4:
            continue
        if any(k in blob for k in keys):
            return layout

    if archetype == "玄幻仙侠" and title_len <= 4:
        return "景观书法"
    if archetype in ("悬疑惊悚",):
        return "字压意境"
    if archetype == "都市爽文":
        return "字压意境" if any(k in blob for k in ("戏神", "诡", "异能")) else "单人顶题"
    return "单人顶题"
