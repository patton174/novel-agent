"""番茄小说封面：品类 + 构图版式（基于平台爆款实证）。"""

from __future__ import annotations

import re

# ---------------------------------------------------------------------------
# 构图版式（参考爆款：《我不是戏神》《天渊》《宦海官途》）
# ---------------------------------------------------------------------------
# A 字压意境：大书法标题占 40%+，人物小/背影/意境，透视纵深感
# B 景观书法：无人物或极弱，山水云海意境，标题居中书法
# C 双人底题：男女半身亲密，标题在下方 1/3，都市虚化夜景
# D 单人顶题：男频 3D 半身直视，标题在上方，描金/金属字
# ---------------------------------------------------------------------------

LAYOUT_MODES: dict[str, dict[str, str]] = {
    "字压意境": {
        "when": "都市异能、悬疑诡谲、戏剧感、规则怪谈；参考《我不是戏神》",
        "composition": (
            "一点透视纵深感（巷道/废墟/长廊），人物在画面中下 1/3、背影或侧身望向远处光源，"
            "体量小于标题；环境暗灰低饱和，单一强调色（如血红）贯穿人物衣袍与标题"
        ),
        "title": (
            "书名超大书法泼墨/飞白笔触，占画面上半 40–50%，可拆为主副字（如白字+红字）；"
            "标题是绝对视觉锚点，作者名居中偏下、小字"
        ),
        "background": "两侧建筑/墙体框景，地面废墟微粒，逆光从标题后方溢出",
    },
    "景观书法": {
        "when": "玄幻仙侠、大气世界观；书名 2–4 字可极简；参考《天渊》",
        "composition": (
            "可无人物；山水云海/仙山深渊/对称镜像景观铺满，意境空灵；"
            "冷色雾霭为主，标题与景观融为一体"
        ),
        "title": (
            "书名居中，巨大黑色或深色书法字，笔画内可有金橙光晕；"
            "作者名红色竖排印章/小牌，贴于标题右上，不抢戏"
        ),
        "background": "远山近雾、水墨+数字绘混合，留白与雾气营造深渊感",
    },
    "双人底题": {
        "when": "甜宠、总裁、豪门、都市言情；参考《宦海官途》",
        "composition": (
            "男女主半身亲密构图（依偎/并肩），占画面中上 2/3，男主前景女主靠肩；"
            "现代都市夜景虚化 bokeh 作顶景，面部精致、戏剧化轮廓光"
        ),
        "title": (
            "书名在画面下方三分之一，超大粗体/无衬线或微书法，白到金黄渐变+外发光；"
            "下方小字作者名；标题区可压圆形青铜/金色纹饰底"
        ),
        "background": "高层夜景/阳台 bokeh，底部留给大标题，忌杂乱文字区",
    },
    "单人顶题": {
        "when": "男频战神、逆袭、赘婿、玄幻人设向；经典流量 3D 封",
        "composition": (
            "单人半身特写居中略偏下，眼神直视观众，服饰华丽符合品类；"
            "人物占 55–65%，强边缘光"
        ),
        "title": (
            "书名在画面上方三分之一，超大立体描金/红金渐变金属字，横跨画幅，缩略图可读"
        ),
        "background": "深色渐变或虚化，粒子/闪电/金光点缀，不抢人物",
    },
}

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

_LAYOUT_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("字压意境", ("戏神", "规则怪谈", "悬疑", "惊悚", "异能", "末世", "废墟")),
    ("景观书法", ("天渊", "仙山", "九天", "仙界", "渡劫飞升")),
    ("双人底题", ("总裁", "豪门", "官途", "精神小妹")),
]

_LANDSCAPE_WRONG_FOR_COUPLE = (
    "无人物",
    "景观书法",
    "深渊意境",
    "山水云海",
    "水墨笔触",
    "山峦与城",
    "镜像景观",
)


def _title_char_count(title: str) -> int:
    return len(re.sub(r"[《》！!?？\s…]", "", title.strip()))


def infer_layout_mode(genre: str, style: str, description: str, title: str, archetype: str) -> str:
    """按品类与内容推断构图版式；甜宠优先，禁止单字关键词误伤。"""
    if archetype == "甜宠言情":
        return "双人底题"

    blob = f"{genre}{style}{description}{title}"
    title_len = _title_char_count(title)

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

_BAD_STYLE = re.compile(
    r"\b(anime\s*style|anime|manga-inspired|manga|pop\s*art|cartoon|flat\s*vector)\b",
    re.I,
)

_BAD_TITLE_PLACEMENT = re.compile(
    r"画面右侧[^，。]*标题|标题[^，。]*画面右侧|右侧留白[^，。]*标题",
)


def infer_archetype(genre: str, style: str, description: str, title: str) -> str:
    blob = f"{genre}{style}{description}{title}"
    for name, keys in _ARCHETYPE_KEYWORDS:
        if any(k in blob for k in keys):
            return name
    return "玄幻仙侠"


def clean_llm_scene(scene: str) -> str:
    """去掉 LLM 爱写的【背景】【主体】分段标记。"""
    cleaned = re.sub(r"【[^】]+】", "", scene or "")
    return re.sub(r"\s+", " ", cleaned).strip(" ，,")


def scene_matches_layout(scene: str, layout: str, title: str) -> bool:
    if layout == "双人底题":
        if any(m in scene for m in _LANDSCAPE_WRONG_FOR_COUPLE):
            return False
        if _title_char_count(title) > 4 and "景观" in scene and "男女" not in scene:
            return False
    if layout == "景观书法" and _title_char_count(title) > 4:
        return False
    return True


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


def _title_clause(layout: str, book: str) -> str:
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
    title_part = _title_clause(layout, book)

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


def ensure_fanqie_title(scene: str, title: str, layout: str) -> str:
    book = title.strip() or "未命名"
    cleaned = _BAD_TITLE_PLACEMENT.sub("", scene)
    cleaned = re.sub(r"标题文字为《[^》]+》[^，。]*", "", cleaned)
    cleaned = re.sub(r"主标题《[^》]+》[^，。]*", "", cleaned)
    cleaned = re.sub(r"[，,]{2,}", "，", cleaned).strip("，, ")
    clause = _title_clause(layout, book)
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

    # 景观封不要强行塞半身人物
    if layout != "景观书法" and layout != "字压意境":
        if "半身" not in cleaned and "双人" not in cleaned and "特写" not in cleaned:
            if layout == "双人底题":
                cleaned = f"男女主半身亲密构图，{cleaned}"
            else:
                cleaned = f"人物半身特写，{cleaned}"

    cleaned = ensure_fanqie_title(cleaned, title, layout)
    return cleaned
