"""Visible text channel prefix parsing."""

from app.agent.harness.visible_text_channel import (
    classify_visible_channel_prefix,
    polish_visible_text,
    prefix_scan_state,
)


def test_classify_orchestration_prefix_strips_body():
    channel, body = classify_visible_channel_prefix("[编排]\n\n将执行 Glob。")
    assert channel == "orchestration"
    assert body == "将执行 Glob。"


def test_classify_delivery_prefix_aliases():
    channel, body = classify_visible_channel_prefix("MSG:\n你好")
    assert channel == "delivery"
    assert body == "你好"


def test_classify_no_prefix():
    channel, body = classify_visible_channel_prefix("你好！")
    assert channel is None
    assert body == "你好！"


def test_prefix_scan_partial_then_none():
    assert prefix_scan_state("[") == "partial"
    assert prefix_scan_state("[编") == "partial"
    assert prefix_scan_state("[编排]") == "none"
    assert prefix_scan_state("你好") == "none"


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


def test_extract_delivery_body_from_inline_prefix():
    from app.agent.harness.visible_text_channel import extract_delivery_body_from_text

    body = extract_delivery_body_from_text(
        "第 5 步完成。\n\n[交付]\n\n# 报告\n\n正文"
    )
    assert "第 5 步" not in body
    assert "报告" in body
    assert "[交付]" not in body
