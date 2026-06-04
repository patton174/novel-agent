"""Unit tests for think tool prompts."""

from app.core.agent_prompts import (
    THINK_INTENSITY_SPEC,
    build_think_fallback_markdown,
    build_think_prompt,
    build_think_system_message,
)


def test_build_think_prompt_includes_task_auto_hint_for_medium():
    prompt = build_think_prompt("续写下一幕", "前文节选", mode="auto", intensity="medium")
    assert "自动判断任务类型" in prompt
    assert "续写下一幕" in prompt
    assert "150" in prompt and "450" in prompt


def test_build_think_prompt_light_intensity():
    prompt = build_think_prompt("写对话", intensity="light")
    assert "自动判断任务类型" in prompt
    assert "80" in prompt and "220" in prompt


def test_build_think_system_message_enforces_char_range():
    msg = build_think_system_message("deep")
    content = msg.content
    spec = THINK_INTENSITY_SPEC["deep"]
    assert str(spec["min_chars"]) in content
    assert str(spec["max_chars"]) in content
    assert "自然流畅" in content
    assert "编排" in content
    assert "误导" in content


def test_fallback_markdown_mentions_user_task():
    md = build_think_fallback_markdown("继续写", mode="auto", intensity="medium")
    assert "继续写" in md
    assert "### 任务" in md
    assert "标准" in md or "分析" in md
