"""Tests for narrative review helpers."""

from app.agent.tools.narrative_review import find_duplicate_paragraphs


def test_find_duplicate_paragraphs_across_chapters():
    shared = ("X" * 40 + "这是一段足够长的重复正文内容用于测试跨章节段落去重。") * 2
    chapters = [
        ("a", "第一章", f"开头\n\n{shared}\n\n结尾"),
        ("b", "第二章", f"其他\n\n{shared}\n\n继续"),
    ]
    hits = find_duplicate_paragraphs(chapters)
    assert len(hits) == 1
    assert set(hits[0]["chapter_ids"]) == {"a", "b"}


def test_find_duplicate_paragraphs_ignores_short():
    chapters = [
        ("a", "A", "短段"),
        ("b", "B", "短段"),
    ]
    assert find_duplicate_paragraphs(chapters) == []
