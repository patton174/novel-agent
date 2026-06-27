"""番茄封面品类与构图版式测试。"""

from app.services.fanqie_cover_spec import (
    default_scene_zh,
    ensure_fanqie_title,
    infer_archetype,
    infer_layout_mode,
    normalize_scene,
    normalize_style,
)


def test_infer_archetype_sweet_romance():
    assert infer_archetype("都市", "轻松", "精神小妹反差甜宠", "我的精神小妹女友！") == "甜宠言情"


def test_infer_layout_couple_bottom_for_romance():
    arch = infer_archetype("都市", "", "甜宠", "我的精神小妹女友！")
    layout = infer_layout_mode("都市", "", "甜宠", "我的精神小妹女友！", arch)
    assert layout == "双人底题"


def test_infer_layout_landscape_for_xianxia_short_title():
    arch = infer_archetype("玄幻", "", "修仙", "天渊")
    layout = infer_layout_mode("玄幻", "", "修仙", "天渊", arch)
    assert layout == "景观书法"


def test_infer_layout_perspective_for_drama():
    arch = infer_archetype("都市", "", "异能", "我不是戏神")
    layout = infer_layout_mode("都市", "", "异能", "我不是戏神", arch)
    assert layout == "字压意境"


def test_default_scene_bottom_title_for_couple_layout():
    scene = default_scene_zh("双人底题", "甜宠言情", "宦海官途", "豪门")
    assert "下方三分之一" in scene
    assert "宦海官途" in scene


def test_default_scene_center_title_for_landscape():
    scene = default_scene_zh("景观书法", "玄幻仙侠", "天渊", "史诗")
    assert "居中" in scene
    assert "天渊" in scene


def test_normalize_scene_fixes_title_on_right():
    bad = "都市女孩半身，画面右侧留白放置标题《测试书》"
    fixed = normalize_scene(bad, "测试书", "甜宠言情", "双人底题", "甜宠")
    assert "上方三分之一" in fixed or "下方三分之一" in fixed
    assert "右侧" not in fixed or "《测试书》" in fixed


def test_normalize_style_rejects_anime():
    style = normalize_style("anime style, manga, pop art", "甜宠言情", "双人底题")
    assert "anime" not in style.lower()


def test_world_in_description_stays_couple_layout():
    arch = infer_archetype("都市", "甜宠", "世界观穿越", "我的精神小妹女友！")
    layout = infer_layout_mode("都市", "甜宠", "世界观穿越", "我的精神小妹女友！", arch)
    assert arch == "甜宠言情"
    assert layout == "双人底题"


def test_ensure_fanqie_title_bottom_for_couple():
    scene = ensure_fanqie_title("男女依偎", "宦海官途", "双人底题")
    assert "下方三分之一" in scene
    assert "宦海官途" in scene
