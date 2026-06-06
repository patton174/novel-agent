"""爬虫统一页面抓取 — Stealth / 代理 / 页面缓存（避免工具间行为不一致）。"""

from __future__ import annotations

from typing import Any
from urllib.parse import urljoin

from app.crawl_agent.context import CrawlAgentContext
from app.services.crawl_proxy import pick_crawl_proxy
from app.services.crawl_scrapling import PageFetchMeta, fetch_page_with_retry


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
