"""Tests for crawl runtime state persistence helpers."""

from __future__ import annotations

from app.crawl.agent.context import ChapterItem, CrawlAgentContext
from app.crawl.agent.runtime_state import (
    apply_runtime_to_context,
    parse_config_json,
    runtime_from_context,
)
from app.crawl.client import CrawlContentClient


def test_runtime_roundtrip():
    ctx = CrawlAgentContext(
        job_id="job-1",
        entry_url="https://example.com/book",
        goal="test",
        client=CrawlContentClient(),
    )
    ctx.novel_title = "测试书"
    ctx.novel_author = "作者"
    ctx.chapters_saved = 2
    ctx.chapters_queue = [
        ChapterItem(title="第一章", url="https://example.com/c1", sort_order=1),
        ChapterItem(title="第二章", url="https://example.com/c2", sort_order=2),
        ChapterItem(title="第三章", url="https://example.com/c3", sort_order=3),
    ]

    runtime = runtime_from_context(ctx)
    fresh = CrawlAgentContext(
        job_id="job-1",
        entry_url="https://example.com/book",
        goal="test",
        client=CrawlContentClient(),
    )
    assert apply_runtime_to_context(fresh, runtime) is True
    assert fresh.novel_title == "测试书"
    assert fresh.chapters_saved == 2
    assert len(fresh.chapters_queue) == 3
    assert fresh.chapters_queue[2].sort_order == 3


def test_parse_config_json_from_string():
    cfg = parse_config_json('{"goal":"x","_runtime":{"chaptersSaved":1}}')
    assert cfg["goal"] == "x"
    assert cfg["_runtime"]["chaptersSaved"] == 1


def test_apply_runtime_empty_queue_returns_false():
    ctx = CrawlAgentContext(
        job_id="j",
        entry_url="https://x",
        goal="g",
        client=CrawlContentClient(),
    )
    assert apply_runtime_to_context(ctx, {"novelTitle": "书"}) is False
    assert ctx.novel_title == "书"
