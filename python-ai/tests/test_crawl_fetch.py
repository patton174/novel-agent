"""Tests for unified crawl fetch (stealth upgrade, page cache)."""

from types import SimpleNamespace

from app.crawl_agent.context import CrawlAgentContext
from app.services.crawl_fetch import fetch_for_crawl, get_cached_page, resolve_crawl_url
from app.services.crawl_scrapling import PageFetchMeta


class _FakeClient:
    async def append_log(self, *args, **kwargs):
        pass


def _ctx(**kwargs) -> CrawlAgentContext:
    return CrawlAgentContext(
        job_id="test",
        entry_url="https://example.com/book/1/",
        goal="test",
        client=_FakeClient(),  # type: ignore[arg-type]
        **kwargs,
    )


def test_resolve_crawl_url_absolute():
    ctx = _ctx()
    assert resolve_crawl_url(ctx, "https://other.com/x") == "https://other.com/x"


def test_resolve_crawl_url_relative():
    ctx = _ctx()
    assert resolve_crawl_url(ctx, "chapter/2.html") == "https://example.com/book/1/chapter/2.html"


def test_page_cache_hit():
    ctx = _ctx()
    page = SimpleNamespace(status=200)
    meta = PageFetchMeta(http_status=200, used_stealth=False, content_chars=100, link_count=5, blocked=False)
    ctx.last_fetched_url = "https://example.com/book/1/"
    ctx.last_cached_page = page
    ctx.last_cached_meta = meta

    cached = get_cached_page(ctx, "https://example.com/book/1/")
    assert cached is not None
    assert cached[0] is page


def test_fetch_for_crawl_upgrades_stealth(monkeypatch):
    ctx = _ctx(use_stealth=False)
    calls: list[bool] = []

    def fake_retry(url, *, stealth, auto_stealth, proxy):
        calls.append(stealth)
        page = SimpleNamespace(status=200)
        meta = PageFetchMeta(
            http_status=200,
            used_stealth=not stealth,
            content_chars=500,
            link_count=10,
            blocked=False,
        )
        return page, meta

    monkeypatch.setattr("app.services.crawl_fetch.fetch_page_with_retry", fake_retry)
    monkeypatch.setattr("app.services.crawl_fetch.pick_crawl_proxy", lambda _cfg: None)

    fetch_for_crawl(ctx, "https://example.com/book/1/")
    assert ctx.use_stealth is True
    assert calls == [False]
