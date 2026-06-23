"""Polish visible assistant text."""

from app.agent.harness.visible_text_channel import polish_visible_text


def test_polish_visible_text_keeps_functional_emoji():
    raw = "🔴 进行中\n🟢 已完成\n✅ 校验通过\n❌ 发现冲突"
    polished = polish_visible_text(raw)
    assert "🔴" in polished
    assert "🟢" in polished
    assert "✅" in polished
    assert "❌" in polished


def test_polish_visible_text_strips_decorative_heading_emoji():
    raw = "🎨 五、风格建议（基于1-2章开篇分析）"
    polished = polish_visible_text(raw)
    assert "🎨" not in polished
    assert "五、风格建议" in polished
