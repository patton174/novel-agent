"""注入 LLM 的番茄铁律摘要。"""

from __future__ import annotations

from app.services.cover.spec.layouts import LAYOUT_MODES


def fanqie_llm_brief(archetype: str, layout: str) -> str:
    spec = LAYOUT_MODES[layout]
    return (
        "番茄封面铁律：竖版9:16；书名必须是视觉第一锚点、字号碾压一切；高对比配色；"
        "背景服务主体，允许虚化/意境；质感为数字绘画/半写实海报，忌低幼卡通。\n\n"
        f"【品类】{archetype}\n"
        f"【构图版式】{layout}（{spec['when']}）\n"
        f"· 构图：{spec['composition']}\n"
        f"· 标题：{spec['title']}\n"
        f"· 背景：{spec['background']}"
    )
