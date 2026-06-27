"""Tests for skill_loader frontmatter parsing."""

from __future__ import annotations

from app.agent.harness.skill_loader import parse_skill_markdown

_SAMPLE = """---
name: fanqie-chapter-hook
version: 1.0.0
description: 番茄短篇章末钩子写法
tools: [ReadChapter, WriteChapter, SearchKnowledge]
locale: zh
---

# 钩子正文

章末制造悬念。
"""


def test_parse_skill_markdown_with_frontmatter():
    parsed = parse_skill_markdown(_SAMPLE)
    assert parsed.name == "fanqie-chapter-hook"
    assert parsed.version == "1.0.0"
    assert parsed.description == "番茄短篇章末钩子写法"
    assert parsed.tools == ["ReadChapter", "WriteChapter", "SearchKnowledge"]
    assert parsed.locale == "zh"
    assert parsed.body.startswith("# 钩子正文")


def test_parse_skill_markdown_without_frontmatter():
    text = "# Plain skill\n\nUse short hooks."
    parsed = parse_skill_markdown(text)
    assert parsed.name == "unknown"
    assert parsed.version == "1"
    assert parsed.tools == []
    assert "Plain skill" in parsed.body
