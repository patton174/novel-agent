from app.agent_step.chapter_body_format import (
    ensure_paragraph_fullwidth_indent,
    normalize_chapter_body_for_persist,
    strip_markdown_artifacts,
)


def test_strip_markdown_artifacts():
    raw = "## 标题\n\n**他说**道\n- 列表项"
    out = strip_markdown_artifacts(raw)
    assert "##" not in out
    assert "**" not in out
    assert "标题" in out


def test_ensure_paragraph_fullwidth_indent():
    out = ensure_paragraph_fullwidth_indent("第一段\n\n第二段")
    assert out.startswith("\u3000\u3000")
    assert "\n\n\u3000\u3000" in out


def test_normalize_chapter_body_for_persist_strips_frontmatter_like_content():
    body = normalize_chapter_body_for_persist("**粗体**一句。\n\n下一段。")
    assert "**" not in body
    assert body.startswith("\u3000\u3000")
