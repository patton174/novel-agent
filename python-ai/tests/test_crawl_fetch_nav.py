"""FetchPage navigation guard tests."""

from app.crawl_agent.context import CrawlAgentContext
from app.crawl_agent.tools.impl import _normalize_url, _register_allowed, _url_allowed
from app.services.crawl_content_client import CrawlContentClient


def _ctx() -> CrawlAgentContext:
    return CrawlAgentContext(
        job_id="preview",
        entry_url="https://www.shuyous.com/",
        goal="爬取热度第一的书籍",
        client=CrawlContentClient(),
    )


def test_entry_url_always_allowed():
    ctx = _ctx()
    assert _url_allowed(ctx, "https://www.shuyous.com/")


def test_guessed_path_rejected_after_first_page():
    ctx = _ctx()
    _register_allowed(ctx, ctx.entry_url, "https://www.shuyous.com/book/123.html")
    assert not _url_allowed(ctx, "https://www.shuyous.com/rank/")
    assert _url_allowed(ctx, "https://www.shuyous.com/book/123.html")


def test_normalize_url_relative():
    assert _normalize_url("https://www.shuyous.com/", "/book/1.html") == "https://www.shuyous.com/book/1.html"
