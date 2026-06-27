from app.core.llm_content import extract_llm_text
from app.services.cover_prompt import (
    CoverPromptRequest,
    build_document,
    build_image_prompt,
    _default_scene_zh,
    _default_style_en,
    _fallback_bundle,
    _infer_category,
    _parse_stream_document,
)
from app.services.fanqie_cover_spec import infer_archetype, infer_layout_mode


def test_build_image_prompt_joins_en_and_zh():
    image = build_image_prompt("3d render, cinematic", "竖版9:16，人物特写")
    assert image.startswith("3d render, cinematic")
    assert "竖版9:16" in image


def test_fallback_bundle_splits_style_and_scene():
    req = CoverPromptRequest(title="龙域战神", genre="男频战神", description="逆袭打脸")
    bundle = _fallback_bundle(req)
    assert bundle.style_prompt
    assert bundle.scene_prompt
    assert "龙域战神" in bundle.scene_prompt
    assert bundle.image_prompt == build_image_prompt(bundle.style_prompt, bundle.scene_prompt)


def test_build_document_has_markdown_sections():
    req = CoverPromptRequest(title="测试书", genre="都市")
    archetype = infer_archetype(req.genre, req.style, req.description, req.title)
    layout = infer_layout_mode(req.genre, req.style, req.description, req.title, archetype)
    style = _default_style_en(_infer_category(req.genre, req.style))
    scene = _default_scene_zh(req.title, _infer_category(req.genre, req.style), "甜宠")
    doc = build_document(req, style, scene, archetype, layout)
    assert "## Role" in doc
    assert "## Style (English)" in doc
    assert "## Scene (中文)" in doc


def test_extract_llm_text_from_thinking_blocks():
    blocks = [
        {"type": "thinking", "thinking": "internal only"},
        {"type": "text", "text": "3d render, cinematic"},
    ]
    assert extract_llm_text(blocks, include_thinking=False) == "3d render, cinematic"


def test_parse_stream_document_from_markdown():
    req = CoverPromptRequest(title="精神小妹", genre="都市甜宠")
    md = """# 封面绘画提示词
## Role
expert
## Style (English)
3d render, neon, high contrast
## Scene (中文)
竖版9:16，标题文字为《精神小妹》，甜宠反差
"""
    bundle = _parse_stream_document(md, req)
    assert "3d render" in bundle.style_prompt
    assert "精神小妹" in bundle.scene_prompt


def test_normalize_style_rejects_anime():
    from app.services.cover_prompt import _normalize_style_prompt

    style = _normalize_style_prompt(
        "anime style, manga-inspired, pop art, vibrant colors",
        "都市甜宠",
    )
    assert "anime" not in style.lower()
    assert "fanqie" in style.lower()
