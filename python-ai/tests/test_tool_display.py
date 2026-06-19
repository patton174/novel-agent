"""Tests for user-facing tool display excerpts."""

from app.agent.harness.events import build_tool_completed_sse_payload, extract_chapter_read_labels
from app.agent.harness.tool_display import (
    format_chapter_read_excerpt,
    strip_line_numbers,
)


def test_strip_line_numbers():
    raw = "     1\t---\n     2\ttitle: 第一章"
    assert "title: 第一章" in strip_line_numbers(raw)


def test_chapter_excerpt_title_and_body_no_ids():
    body = "---\ntitle: 第5章 初入社会\nchapter_id: abc\nlist_index: 2\n---\n\n这是正文开头。"
    numbered = "\n".join(f"{i + 1}\t{line}" for i, line in enumerate(body.split("\n")))
    excerpt = format_chapter_read_excerpt(numbered)
    assert "第5章 初入社会" in excerpt
    assert "这是正文" in excerpt
    assert "chapter_id" not in excerpt
    assert "abc" not in excerpt or "abc" in "这是正文"  # uuid not in excerpt


def test_extract_chapter_labels_with_line_numbers():
    content = "\n".join(
        f"{i + 1}\t{line}"
        for i, line in enumerate(
            "---\ntitle: 第5章\nchapter_id: x\nlist_index: 3\n---\n\nbody".split("\n")
        )
    )
    labels = extract_chapter_read_labels(content)
    assert labels == ["《第5章》·作品列表第3章"]


def test_sse_read_chapter_uses_display_excerpt():
    content = "---\ntitle: 测试章\nchapter_id: u\nlist_index: 1\n---\n\n正文内容。"
    payload = build_tool_completed_sse_payload(
        "ReadChapter",
        content=content,
        tool_input={"chapter_id": "u"},
    )
    assert "display_excerpt" in payload
    assert "测试章" in payload["display_excerpt"]
    assert "正文" in payload["display_excerpt"]
    assert "chapter_id" not in payload["display_excerpt"]
