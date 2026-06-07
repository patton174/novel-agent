"""爬虫统一页面抓取 — Stealth / 代理 / 页面缓存（避免工具间行为不一致）。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin

from app.crawl.agent.context import CrawlAgentContext
from app.crawl.fetch.proxy import pick_crawl_proxy
from app.crawl.fetch.scrapling import PageFetchMeta, fetch_page_with_retry


def resolve_crawl_url(ctx: CrawlAgentContext, url: str) -> str:
    u = (url or "").strip()
    if u.startswith("http://") or u.startswith("https://"):
        return u
    return urljoin(ctx.entry_url, u)


def note_stealth_upgrade(ctx: CrawlAgentContext, meta: PageFetchMeta) -> None:
    if meta.used_stealth and not ctx.use_stealth:
        ctx.use_stealth = True


def get_cached_page(ctx: CrawlAgentContext, url: str) -> tuple[Any, PageFetchMeta] | None:
    target = resolve_crawl_url(ctx, url)
    if (
        ctx.last_fetched_url == target
        and ctx.last_cached_page is not None
        and ctx.last_cached_meta is not None
    ):
        return ctx.last_cached_page, ctx.last_cached_meta
    return None


def store_page_cache(ctx: CrawlAgentContext, url: str, page: Any, meta: PageFetchMeta) -> None:
    ctx.last_fetched_url = url
    ctx.last_cached_page = page
    ctx.last_cached_meta = meta


@dataclass
class HtmlBodyPage:
    """Playwright 会话 goto 返回的 HTML，供 page_text / extract_chapter 复用。"""

    body: str
    status: int = 200


async def fetch_for_crawl_async(
    ctx: CrawlAgentContext,
    url: str,
    *,
    stealth: bool | None = None,
    auto_stealth: bool = True,
    use_cache: bool = False,
) -> tuple[Any, PageFetchMeta]:
    """异步抓取；若 Browser 会话已打开则复用，避免 SaveQueuedChapters 再开 Stealth。"""
    import asyncio

    target = resolve_crawl_url(ctx, url)
    session = ctx.browser_session
    if session is not None and getattr(session, "is_open", False):
        snap = await session.goto(target)
        blocked = snap.http_status >= 400
        html = snap.html or ""
        page = HtmlBodyPage(body=html, status=snap.http_status)
        meta = PageFetchMeta(
            http_status=snap.http_status,
            used_stealth=False,
            content_chars=len(html),
            link_count=0,
            blocked=blocked,
            hint=f"HTTP {snap.http_status}" if blocked else "",
        )
        if not blocked:
            store_page_cache(ctx, target, page, meta)
        return page, meta

    return await asyncio.to_thread(
        fetch_for_crawl,
        ctx,
        url,
        stealth=stealth,
        auto_stealth=auto_stealth,
        use_cache=use_cache,
    )


def fetch_for_crawl(
    ctx: CrawlAgentContext,
    url: str,
    *,
    stealth: bool | None = None,
    auto_stealth: bool = True,
    use_cache: bool = False,
) -> tuple[Any, PageFetchMeta]:
    """所有爬虫工具必须通过此函数抓取，保证 Stealth/代理/缓存一致。"""
    target = resolve_crawl_url(ctx, url)

    if use_cache:
        cached = get_cached_page(ctx, target)
        if cached is not None:
            return cached

    use_stealth_flag = ctx.use_stealth if stealth is None else stealth
    page, meta = fetch_page_with_retry(
        target,
        stealth=use_stealth_flag,
        auto_stealth=auto_stealth and stealth is None,
        proxy=pick_crawl_proxy(ctx.site_config),
    )
    note_stealth_upgrade(ctx, meta)
    store_page_cache(ctx, target, page, meta)
    return page, meta


def fetch_page_only(ctx: CrawlAgentContext, url: str, **kwargs: Any) -> Any:
    page, _meta = fetch_for_crawl(ctx, url, **kwargs)
    return page
