"""Tests for unified FetchEngine / ScrapeResult."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.crawl.agent.context import CrawlAgentContext
from app.crawl.engine.fetch_engine import FetchEngine, ScrapeOptions, ScrapeResult
from app.crawl.engine.modes import FetchMode


def _ctx() -> CrawlAgentContext:
    return CrawlAgentContext(
        job_id="preview",
        entry_url="https://example.com/book/1.html",
        goal="test",
        client=MagicMock(),
    )


def test_scrape_result_to_tool_payload_truncates():
    result = ScrapeResult(
        url="https://example.com/ch/1",
        http_status=200,
        mode=FetchMode.HTTP,
        blocked=False,
        html="x" * 3000,
    )
    payload = result.to_tool_payload(max_preview=100)
    assert len(payload["content"]) == 100
    assert payload["html_chars"] == 3000
    assert payload["mode"] == "http"


@pytest.mark.asyncio
async def test_scrape_http_mode_skips_browser():
    ctx = _ctx()
    page = MagicMock()
    meta = MagicMock(http_status=200, used_stealth=False, blocked=False, hint="")

    with patch(
        "app.crawl.engine.fetch_engine.fetch_for_crawl_async",
        new_callable=AsyncMock,
        return_value=(page, meta),
    ) as fetch_mock:
        with patch("app.crawl.engine.fetch_engine.page_html", return_value="<html>ok</html>"):
            result = await FetchEngine().scrape(
                ctx,
                "https://example.com/index.html",
                ScrapeOptions(mode=FetchMode.HTTP, formats=("html",)),
            )

    fetch_mock.assert_awaited_once()
    assert result.mode == FetchMode.HTTP
    assert result.blocked is False
    assert "ok" in result.html


@pytest.mark.asyncio
async def test_scrape_browser_mode_on_blocked_http():
    ctx = _ctx()
    page = MagicMock()
    meta = MagicMock(http_status=403, used_stealth=False, blocked=True, hint="forbidden")

    long_html = "<body>" + ("chapter-content " * 12) + "</body>"
    snap = MagicMock(url="https://example.com/index.html", html=long_html, http_status=200)

    with patch(
        "app.crawl.engine.fetch_engine.fetch_for_crawl_async",
        new_callable=AsyncMock,
        return_value=(page, meta),
    ):
        with patch(
            "app.crawl.engine.fetch_engine.CrawlBrowserSession"
        ) as browser_cls:
            session = AsyncMock()
            session.is_open = False
            session.goto = AsyncMock(return_value=snap)
            browser_cls.return_value = session
            with patch("app.crawl.engine.fetch_engine.prepare_html_for_ai", return_value=long_html):
                with patch("app.crawl.engine.fetch_engine.settings.crawl_prefer_playwright", False):
                    with patch("app.crawl.engine.fetch_engine.settings.crawl_browser_fetch_enabled", True):
                        result = await FetchEngine().scrape(
                        ctx,
                        "https://example.com/index.html",
                            ScrapeOptions(mode=None, formats=("html",), auto_stealth=False),
                        )

    assert result.mode == FetchMode.BROWSER
    assert result.blocked is False
