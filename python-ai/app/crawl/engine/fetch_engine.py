"""Unified fetch engine — single scrape entry with mode upgrade ladder."""

from __future__ import annotations

import logging
import time
from typing import Any

from app.config import settings
from app.crawl.metrics import record_fetch
from app.crawl.engine.html_clean import strip_scripts_and_styles
from app.crawl.engine.modes import FetchMode
from app.crawl.engine.selectors import extract_links_from_items
from app.crawl.engine.types import LinkItem, ScrapeOptions, ScrapeResult
from app.crawl.agent.context import CrawlAgentContext
from app.crawl.fetch.browser import CrawlBrowserSession, prepare_html_for_ai
from app.crawl.fetch.fetch import HtmlBodyPage, fetch_for_crawl_async, resolve_crawl_url
from app.crawl.fetch.proxy import pick_crawl_proxy
from app.crawl.fetch.scrapling import page_html, page_links, page_text

logger = logging.getLogger(__name__)

__all__ = ["FetchEngine", "LinkItem", "ScrapeOptions", "ScrapeResult"]


class FetchEngine:
    """Scrape pipeline: http → stealth → browser (when mode is None or auto-upgrade)."""

    async def scrape(
        self,
        ctx: CrawlAgentContext,
        url: str,
        opts: ScrapeOptions | None = None,
    ) -> ScrapeResult:
        started = time.perf_counter()
        options = opts or ScrapeOptions()
        target = resolve_crawl_url(ctx, url)
        proxy = options.proxy if options.proxy is not None else pick_crawl_proxy(ctx.site_config)

        effective_mode = options.mode
        if effective_mode is None and settings.crawl_prefer_playwright and settings.crawl_browser_fetch_enabled:
            effective_mode = FetchMode.BROWSER

        if effective_mode == FetchMode.BROWSER:
            browser_result = await self._scrape_browser(ctx, target, proxy, options)
            if not browser_result.blocked or options.mode == FetchMode.BROWSER:
                final = self._finalize(target, browser_result, options)
                self._record(final, started, upgraded=False)
                return final

        stealth_flag: bool | None
        auto_stealth = options.auto_stealth
        if effective_mode == FetchMode.STEALTH:
            stealth_flag = True
            auto_stealth = False
        elif effective_mode == FetchMode.HTTP:
            stealth_flag = False
            auto_stealth = False
        else:
            stealth_flag = None

        page, meta = await fetch_for_crawl_async(
            ctx,
            target,
            stealth=stealth_flag,
            auto_stealth=auto_stealth and stealth_flag is None,
            use_cache=options.use_cache,
        )
        mode = FetchMode.STEALTH if meta.used_stealth else FetchMode.HTTP
        result = ScrapeResult(
            url=target,
            http_status=meta.http_status,
            mode=mode,
            blocked=meta.blocked,
            used_stealth=meta.used_stealth,
            hint=meta.hint,
            page=page,
        )
        upgraded = False
        if (
            result.blocked
            and options.mode is None
            and settings.crawl_browser_fetch_enabled
        ):
            browser_result = await self._scrape_browser(ctx, target, proxy, options)
            if not browser_result.blocked:
                upgraded = True
                final = self._finalize(target, browser_result, options)
                self._record(final, started, upgraded=upgraded)
                return final
        final = self._finalize(target, result, options)
        self._record(final, started, upgraded=upgraded)
        return final

    @staticmethod
    def _record(result: ScrapeResult, started: float, *, upgraded: bool) -> None:
        record_fetch(
            mode=result.mode.value,
            blocked=result.blocked,
            duration_sec=time.perf_counter() - started,
            upgraded=upgraded or result.used_stealth,
        )

    async def _scrape_browser(
        self,
        ctx: CrawlAgentContext,
        target: str,
        proxy: str | None,
        options: ScrapeOptions,
    ) -> ScrapeResult:
        session = ctx.browser_session
        if session is None or not session.is_open:
            session = CrawlBrowserSession(proxy=proxy)
            ctx.browser_session = session
        timeout = min(options.timeout_ms or settings.crawl_browser_timeout_ms, 25_000)
        try:
            snap = await session.goto(target, timeout_ms=timeout)
        except Exception as exc:
            msg = str(exc)[:300]
            logger.warning("browser scrape failed url=%s: %s", target, msg)
            return ScrapeResult(
                url=target,
                http_status=0,
                mode=FetchMode.BROWSER,
                blocked=True,
                hint=msg,
            )

        html = prepare_html_for_ai(snap.html)
        blocked = snap.http_status >= 400 or len(html.strip()) < 80
        page = HtmlBodyPage(body=snap.html, status=snap.http_status)
        return ScrapeResult(
            url=snap.url or target,
            http_status=snap.http_status,
            mode=FetchMode.BROWSER,
            blocked=blocked,
            html=html,
            used_stealth=True,
            hint=f"HTTP {snap.http_status}" if blocked else "",
            page=page,
        )

    def _finalize(self, target: str, result: ScrapeResult, options: ScrapeOptions) -> ScrapeResult:
        if result.page is not None:
            if "html" in options.formats and not result.html:
                result.html = page_html(result.page, 22_000)
            if "text" in options.formats and not result.text:
                result.text = page_text(result.page, 18_000)
            if "links" in options.formats and not result.links:
                raw_links = page_links(result.page, target)
                result.links = extract_links_from_items(raw_links, target)
            if "markdown" in options.formats and not result.markdown:
                body = result.text or strip_scripts_and_styles(str(getattr(result.page, "body", "") or ""))
                result.markdown = body
        if not result.html and result.text:
            result.html = result.text
        return result
