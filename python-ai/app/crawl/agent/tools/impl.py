"""Crawl agent tool implementations — Scrapling fetch + Content API side effects."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from app.config import settings
from app.crawl.agent.context import ChapterItem, CrawlAgentContext
from app.crawl.agent.limits import batch_save_count, slice_chapters
from app.crawl.agent.runtime_state import persist_runtime
from app.crawl.agent.tools.base import append_log as _append_log
from app.crawl.agent.tools.base import crawl_proxy as _crawl_proxy
from app.crawl.agent.tools.base import json_err as _json_err
from app.crawl.agent.tools.base import json_ok as _json_ok
from app.crawl.agent.tools.registry import register_tool
from app.crawl.agent.tools.schemas import (
    BrowserClickInput,
    BrowserGotoInput,
    BrowserOpenInput,
    BrowserSnapshotInput,
    CompleteJobInput,
    FailJobInput,
    FetchAndSaveChapterInput,
    FetchPageInput,
    GetJobStatusInput,
    InitNovelInput,
    MapLinksInput,
    QueueChaptersInput,
    SaveQueuedChaptersInput,
    UpdateCoverUrlInput,
)
from app.crawl.agent.tools.tool import CrawlTool, CrawlToolResult
from app.crawl.config import get_crawl_limits
from app.crawl.engine.fetch_engine import FetchEngine, ScrapeOptions
from app.crawl.engine.modes import FetchMode
from app.crawl.engine.selectors import extract_links_from_items, guess_sort_orders
from app.crawl.extract.ai_extractor import extract_chapter
from app.crawl.fetch.browser import (
    BrowserSnapshot,
    CrawlBrowserSession,
    prepare_html_for_ai,
)
from app.crawl.fetch.fetch import fetch_for_crawl, fetch_for_crawl_async, resolve_crawl_url
from app.crawl.fetch.scrapling import page_links
from app.crawl.metrics import record_chapter_saved

_REGISTERED = False
_FETCH_ENGINE = FetchEngine()


async def _job_cancelled(ctx: CrawlAgentContext) -> bool:
    if ctx.job_id == "preview":
        return False
    job = await ctx.client.get_job(ctx.job_id)
    if not job:
        return True
    return str(job.get("status") or "").upper() in {"CANCELLED", "PAUSED"}


def _browser_session(ctx: CrawlAgentContext) -> CrawlBrowserSession:
    if ctx.browser_session is None:
        ctx.browser_session = CrawlBrowserSession(proxy=_crawl_proxy(ctx))
    return ctx.browser_session


def _snapshot_payload(snap: BrowserSnapshot) -> tuple[str, dict[str, Any]]:
    html = prepare_html_for_ai(snap.html)
    preview = html[:1500]
    return html, {
        "url": snap.url,
        "title": snap.title,
        "http_status": snap.http_status,
        "content": preview,
        "html_chars": len(html),
        "note": "完整 HTML 已追加至 RUN_CONTEXT，请自行读 href/正文决定下一步。",
    }


def _append_snapshot_to_context(snap: BrowserSnapshot) -> dict[str, Any]:
    html = prepare_html_for_ai(snap.html)
    return {
        "append_page": {
            "url": snap.url,
            "title": snap.title,
            "content": html,
        }
    }


async def _fetch_page_via_browser(ctx: CrawlAgentContext, target: str) -> CrawlToolResult:
    pw_timeout = min(settings.crawl_browser_timeout_ms, 25_000)
    snap = await _browser_session(ctx).goto(target, timeout_ms=pw_timeout)
    ctx.last_fetched_url = snap.url
    ctx.use_stealth = True
    html, payload = _snapshot_payload(snap)
    blocked = snap.http_status >= 400 or len(html.strip()) < 80
    if blocked:
        msg = f"HTTP {snap.http_status}，Playwright 未拿到有效页"
        await _append_log(ctx, "WARN", f"FetchPage(Playwright) · {msg}")
        patch: dict[str, Any] = {}
        if html.strip():
            patch["append_page"] = {"url": snap.url, "content": html}
        return CrawlToolResult(
            content=_json_err(
                msg,
                url=snap.url,
                http_status=snap.http_status,
                used_stealth=True,
                content=html[:1500],
                html_chars=len(html),
            ),
            is_error=True,
            count_as_failure=snap.http_status not in {403, 429},
            context_patch=patch,
        )
    await _append_log(ctx, "INFO", f"FetchPage(Playwright) 成功 · {snap.url} · HTML {len(html)} 字")
    return CrawlToolResult(
        content=_json_ok(
            url=snap.url,
            http_status=snap.http_status,
            used_stealth=True,
            content=html[:1500],
            html_chars=len(html),
            note="Playwright 抓取；完整 HTML 已追加至 RUN_CONTEXT。",
        ),
        context_patch=_append_snapshot_to_context(snap),
    )


async def _fetch_page_tool(ctx: CrawlAgentContext, inp: FetchPageInput) -> CrawlToolResult:
    target = resolve_crawl_url(ctx, inp.url.strip())
    await _append_log(ctx, "INFO", f"FetchPage: {target}")

    mode = None
    if inp.use_stealth is True:
        mode = FetchMode.STEALTH
    elif inp.use_stealth is False:
        mode = FetchMode.HTTP
    elif settings.crawl_prefer_playwright and settings.crawl_browser_fetch_enabled:
        mode = FetchMode.BROWSER

    budget = get_crawl_limits().html_budget
    scrape = await _FETCH_ENGINE.scrape(
        ctx,
        target,
        ScrapeOptions(mode=mode, formats=("html",), auto_stealth=inp.use_stealth is None),
    )
    ctx.last_fetched_url = scrape.url
    body = scrape.html or ""

    if scrape.blocked:
        msg = scrape.hint or "无法获取有效页面内容"
        is_transport = scrape.http_status == 0
        await _append_log(
            ctx,
            "WARN" if scrape.http_status in {403, 429} else "INFO",
            f"FetchPage 未拿到可用页 · HTTP {scrape.http_status} · {msg}",
        )
        patch: dict[str, Any] = {}
        if body.strip():
            patch["append_page"] = {"url": scrape.url, "content": body}
        return CrawlToolResult(
            content=_json_err(
                msg,
                url=scrape.url,
                http_status=scrape.http_status,
                used_stealth=scrape.used_stealth,
                mode=scrape.mode.value,
                content=body[:1500],
                html_chars=len(body),
            ),
            is_error=True,
            count_as_failure=not is_transport,
            context_patch=patch,
        )

    if scrape.used_stealth and inp.use_stealth is None:
        ctx.use_stealth = True
        await _append_log(ctx, "INFO", "已自动切换 Stealth 浏览器抓取（后续抓取将沿用）")
    elif scrape.http_status >= 300:
        await _append_log(ctx, "WARN", f"FetchPage HTTP {scrape.http_status} · HTML {len(body)} 字")

    return CrawlToolResult(
        content=_json_ok(
            url=scrape.url,
            http_status=scrape.http_status,
            used_stealth=scrape.used_stealth,
            mode=scrape.mode.value,
            content=body[:1500],
            html_chars=len(body),
            note="完整 HTML 已追加至 RUN_CONTEXT。目录发现可优先 MapLinks。",
        ),
        context_patch={"append_page": {"url": scrape.url, "content": body[:budget]}},
    )


async def _map_links_tool(ctx: CrawlAgentContext, inp: MapLinksInput) -> CrawlToolResult:
    target = resolve_crawl_url(ctx, inp.url.strip())
    await _append_log(ctx, "INFO", f"MapLinks: {target}")
    limits = get_crawl_limits()

    mode = FetchMode.STEALTH if inp.use_stealth else None
    scrape = await _FETCH_ENGINE.scrape(
        ctx,
        target,
        ScrapeOptions(mode=mode, formats=("html", "links"), auto_stealth=inp.use_stealth is None),
    )
    ctx.last_fetched_url = scrape.url

    links = scrape.links
    if not links and scrape.page is not None:
        raw = page_links(scrape.page, scrape.url, limit=limits.map_links_limit)
        links = extract_links_from_items(raw, scrape.url, limit=limits.map_links_limit)

    if scrape.blocked and not links:
        return CrawlToolResult(
            content=_json_err(scrape.hint or "无法获取页面链接", url=scrape.url),
            is_error=True,
        )

    preview = guess_sort_orders(links)
    by_kind: dict[str, int] = {}
    for ln in links:
        by_kind[ln.kind] = by_kind.get(ln.kind, 0) + 1

    patch: dict[str, Any] = {}
    if scrape.html:
        patch["append_page"] = {"url": scrape.url, "content": scrape.html[: limits.html_budget]}

    return CrawlToolResult(
        content=_json_ok(
            url=scrape.url,
            link_count=len(links),
            links_by_kind=by_kind,
            chapters_preview=preview,
            links_sample=[
                {"text": ln.text, "url": ln.url, "kind": ln.kind} for ln in links[:20]
            ],
            note="请根据 chapters_preview / links_sample 调用 QueueChapters，勿凭空拼 URL。",
        ),
        context_patch=patch,
    )


async def _browser_open_tool(ctx: CrawlAgentContext, inp: BrowserOpenInput) -> CrawlToolResult:
    target = resolve_crawl_url(ctx, inp.url.strip())
    await _append_log(ctx, "INFO", f"BrowserOpen: {target}")
    try:
        snap = await _browser_session(ctx).goto(target)
    except Exception as exc:
        msg = str(exc)[:500]
        await _append_log(ctx, "ERROR", f"BrowserOpen 失败 · {msg}")
        return CrawlToolResult(content=_json_err(msg), is_error=True)

    ctx.last_fetched_url = snap.url
    ctx.use_stealth = True
    html, payload = _snapshot_payload(snap)
    await _append_log(ctx, "INFO", f"BrowserOpen 成功 · {snap.url} · HTML {len(html)} 字")
    return CrawlToolResult(content=_json_ok(**payload), context_patch=_append_snapshot_to_context(snap))


async def _browser_goto_tool(ctx: CrawlAgentContext, inp: BrowserGotoInput) -> CrawlToolResult:
    if ctx.browser_session is None or not ctx.browser_session.is_open:
        return CrawlToolResult(
            content=_json_err("浏览器未打开，请先 BrowserOpen"),
            is_error=True,
        )
    target = resolve_crawl_url(ctx, inp.url.strip())
    await _append_log(ctx, "INFO", f"BrowserGoto: {target}")
    try:
        snap = await ctx.browser_session.goto(target)
    except Exception as exc:
        msg = str(exc)[:500]
        await _append_log(ctx, "ERROR", f"BrowserGoto 失败 · {msg}")
        return CrawlToolResult(content=_json_err(msg), is_error=True)

    ctx.last_fetched_url = snap.url
    html, payload = _snapshot_payload(snap)
    await _append_log(ctx, "INFO", f"BrowserGoto 成功 · {snap.url} · HTML {len(html)} 字")
    return CrawlToolResult(content=_json_ok(**payload), context_patch=_append_snapshot_to_context(snap))


async def _browser_click_tool(ctx: CrawlAgentContext, inp: BrowserClickInput) -> CrawlToolResult:
    if ctx.browser_session is None or not ctx.browser_session.is_open:
        return CrawlToolResult(
            content=_json_err("浏览器未打开，请先 BrowserOpen"),
            is_error=True,
        )
    label = inp.text.strip() or inp.selector.strip()
    await _append_log(ctx, "INFO", f"BrowserClick: {label!r}")
    try:
        snap = await ctx.browser_session.click(text=inp.text.strip(), selector=inp.selector.strip())
    except Exception as exc:
        msg = str(exc)[:500]
        await _append_log(ctx, "ERROR", f"BrowserClick 失败 · {msg}")
        return CrawlToolResult(content=_json_err(msg), is_error=True)

    ctx.last_fetched_url = snap.url
    html, payload = _snapshot_payload(snap)
    await _append_log(ctx, "INFO", f"BrowserClick 成功 · {snap.url} · HTML {len(html)} 字")
    return CrawlToolResult(content=_json_ok(**payload), context_patch=_append_snapshot_to_context(snap))


async def _browser_snapshot_tool(ctx: CrawlAgentContext, _inp: BrowserSnapshotInput) -> CrawlToolResult:
    if ctx.browser_session is None or not ctx.browser_session.is_open:
        return CrawlToolResult(
            content=_json_err("浏览器未打开，请先 BrowserOpen"),
            is_error=True,
        )
    await _append_log(ctx, "INFO", "BrowserSnapshot")
    try:
        snap = await ctx.browser_session.snapshot()
    except Exception as exc:
        msg = str(exc)[:500]
        return CrawlToolResult(content=_json_err(msg), is_error=True)

    ctx.last_fetched_url = snap.url
    html, payload = _snapshot_payload(snap)
    return CrawlToolResult(content=_json_ok(**payload), context_patch=_append_snapshot_to_context(snap))


async def _queue_chapters_tool(ctx: CrawlAgentContext, inp: QueueChaptersInput) -> CrawlToolResult:
    incoming = slice_chapters(inp.chapters, ctx.max_chapters)
    if not incoming:
        return CrawlToolResult(content=_json_err("chapters 不能为空"), is_error=True)

    normalized: list[ChapterItem] = []
    seen_urls: set[str] = set()
    for item in incoming:
        url = resolve_crawl_url(ctx, item.url.strip())
        if url in seen_urls:
            continue
        seen_urls.add(url)
        normalized.append(
            ChapterItem(
                title=(item.title or f"第{item.sort_order}章").strip()[:200],
                url=url,
                sort_order=item.sort_order,
            )
        )
    normalized.sort(key=lambda c: c.sort_order)
    if not normalized:
        return CrawlToolResult(content=_json_err("无有效章节 URL"), is_error=True)

    if inp.append and ctx.chapters_queue:
        merged = {c.url: c for c in ctx.chapters_queue}
        for ch in normalized:
            merged[ch.url] = ch
        ctx.chapters_queue = sorted(merged.values(), key=lambda c: c.sort_order)
    else:
        ctx.chapters_queue = normalized

    ctx.novel_title = inp.novel_title.strip()
    ctx.novel_author = inp.author.strip()
    ctx.novel_description = inp.description.strip()
    source = inp.source_url.strip() or ctx.source_url or ctx.entry_url
    ctx.source_url = resolve_crawl_url(ctx, source) if source else ctx.entry_url

    if ctx.job_id != "preview":
        await ctx.client.update_progress(
            ctx.job_id,
            title=ctx.novel_title,
            chapters_total=len(ctx.chapters_queue),
            chapters_done=ctx.chapters_saved,
        )
        await persist_runtime(ctx)

    preview = [
        {"sort_order": c.sort_order, "title": c.title, "url": c.url}
        for c in ctx.chapters_queue[:15]
    ]
    await _append_log(
        ctx,
        "SUCCESS",
        f"QueueChapters: 《{ctx.novel_title}》队列 {len(ctx.chapters_queue)} 章（本次登记 {len(normalized)}）",
    )
    return CrawlToolResult(
        content=_json_ok(
            novel_title=ctx.novel_title,
            author=ctx.novel_author,
            chapter_count=len(ctx.chapters_queue),
            chapters_preview=preview,
            next_step="InitNovel → SaveQueuedChapters",
        ),
        context_patch={
            "append_catalog": {
                "url": ctx.source_url,
                "title": ctx.novel_title,
                "author": ctx.novel_author,
                "chapter_count": len(ctx.chapters_queue),
                "chapters_preview": preview,
            }
        },
    )


async def _init_novel_tool(ctx: CrawlAgentContext, inp: InitNovelInput) -> CrawlToolResult:
    if not ctx.chapters_queue:
        return CrawlToolResult(
            content=_json_err("请先 QueueChapters 登记章节，再 InitNovel"),
            is_error=True,
        )
    source = inp.source_url.strip() or ctx.source_url or ctx.entry_url
    await _append_log(ctx, "INFO", "InitNovel: 初始化书库")
    await ctx.client.init_catalog(
        ctx.job_id,
        title=inp.title,
        author=inp.author,
        description=inp.description,
        source_url=source,
    )
    job = await ctx.client.get_job(ctx.job_id)
    ctx.catalog_novel_id = str(job.get("catalogNovelId") or ctx.catalog_novel_id)
    ctx.novel_title = inp.title
    ctx.novel_author = inp.author
    ctx.source_url = source
    return CrawlToolResult(content=_json_ok(catalog_novel_id=ctx.catalog_novel_id, title=inp.title))


async def _fetch_and_save_chapter_tool(
    ctx: CrawlAgentContext,
    inp: FetchAndSaveChapterInput,
) -> CrawlToolResult:
    if await _job_cancelled(ctx):
        return CrawlToolResult(content=_json_err("任务已暂停或取消"), is_error=True, end_run=True)

    if not ctx.catalog_novel_id:
        job = await ctx.client.get_job(ctx.job_id)
        ctx.catalog_novel_id = str(job.get("catalogNovelId") or "")

    total = len(ctx.chapters_queue) or inp.sort_order
    await _append_log(ctx, "INFO", f"[{inp.sort_order}/{total}] FetchAndSaveChapter: {inp.title_hint or inp.url}")

    page, meta = await asyncio.to_thread(fetch_for_crawl, ctx, inp.url)
    if meta.blocked:
        msg = meta.hint or f"HTTP {meta.http_status}，章节页不可用"
        await _append_log(ctx, "ERROR", f"[{inp.sort_order}/{total}] 抓取失败 · {msg}")
        return CrawlToolResult(content=_json_err(msg, url=inp.url), is_error=True)
    extracted = await extract_chapter(
        page, inp.url, fallback_title=inp.title_hint, site_config=ctx.site_config
    )
    result = await ctx.client.import_chapter(
        ctx.job_id,
        title=extracted.title,
        content=extracted.content,
        sort_order=inp.sort_order,
        source_url=inp.url,
    )
    ctx.catalog_novel_id = str(result.get("catalogNovelId") or ctx.catalog_novel_id)
    ctx.mark_chapter_saved(inp.sort_order)
    record_chapter_saved()
    await ctx.client.update_progress(ctx.job_id, chapters_done=ctx.chapters_saved)
    await persist_runtime(ctx)
    await _append_log(
        ctx,
        "SUCCESS",
        f"[{inp.sort_order}/{total}] 已入库 · {len(extracted.content)} 字 · {extracted.title}",
    )
    return CrawlToolResult(
        content=_json_ok(
            sort_order=inp.sort_order,
            title=extracted.title,
            content_length=len(extracted.content),
            chapters_saved=ctx.chapters_saved,
            chapters_total=len(ctx.chapters_queue) or total,
        )
    )


async def _save_queued_chapters_tool(
    ctx: CrawlAgentContext,
    inp: SaveQueuedChaptersInput,
) -> CrawlToolResult:
    """批量保存队列中尚未入库的章节，减少 LLM 轮次。"""
    if not ctx.chapters_queue:
        return CrawlToolResult(content=_json_err("章节队列为空，请先 QueueChapters"), is_error=True)

    if await _job_cancelled(ctx):
        return CrawlToolResult(content=_json_err("任务已暂停或取消"), is_error=True, end_run=True)

    if not ctx.catalog_novel_id and ctx.job_id != "preview":
        job = await ctx.client.get_job(ctx.job_id)
        ctx.catalog_novel_id = str(job.get("catalogNovelId") or "")

    start = ctx.next_save_start(inp.start_from)
    cap = batch_save_count(ctx.max_chapters, inp.max_count)
    pending = [c for c in ctx.chapters_queue if c.sort_order not in ctx.saved_sort_orders and c.sort_order >= start][:cap]
    if not pending:
        return CrawlToolResult(
            content=_json_ok(
                saved=0,
                chapters_saved=ctx.chapters_saved,
                message="无待保存章节",
            )
        )

    total = len(ctx.chapters_queue)
    await _append_log(
        ctx,
        "INFO",
        f"SaveQueuedChapters: 本批 {len(pending)} 章（从第 {start} 章，每批默认最多 20 章）",
    )
    saved = 0
    errors: list[str] = []

    for ch in pending:
        if await _job_cancelled(ctx):
            break
        await _append_log(
            ctx,
            "INFO",
            f"[{ch.sort_order}/{total}] 抓取中 · {ch.title or ch.url}",
        )
        try:
            page, meta = await fetch_for_crawl_async(ctx, ch.url)
            if meta.blocked:
                raise ValueError(meta.hint or f"HTTP {meta.http_status}")
            extracted = await extract_chapter(
                page, ch.url, fallback_title=ch.title, site_config=ctx.site_config
            )
            if ctx.job_id != "preview":
                result = await ctx.client.import_chapter(
                    ctx.job_id,
                    title=extracted.title,
                    content=extracted.content,
                    sort_order=ch.sort_order,
                    source_url=ch.url,
                )
                ctx.catalog_novel_id = str(result.get("catalogNovelId") or ctx.catalog_novel_id)
            ctx.mark_chapter_saved(ch.sort_order)
            record_chapter_saved()
            saved += 1
            if ctx.job_id != "preview":
                await ctx.client.update_progress(ctx.job_id, chapters_done=ctx.chapters_saved)
            await _append_log(
                ctx,
                "SUCCESS",
                f"[{ch.sort_order}/{total}] 已入库 · {len(extracted.content)} 字 · {extracted.title}",
            )
        except Exception as exc:
            errors.append(f"第{ch.sort_order}章: {exc}")
            await _append_log(ctx, "ERROR", f"[{ch.sort_order}/{total}] 失败: {exc}")

    if errors and saved == 0:
        return CrawlToolResult(content=_json_err("; ".join(errors[:3])), is_error=True)

    if ctx.job_id != "preview":
        await persist_runtime(ctx)

    return CrawlToolResult(
        content=_json_ok(
            saved=saved,
            chapters_saved=ctx.chapters_saved,
            chapters_total=total,
            errors=errors[:5] if errors else [],
            next_step="若仍有剩余章节可再次 SaveQueuedChapters，否则 CompleteJob",
        )
    )


async def _get_job_status_tool(ctx: CrawlAgentContext, _inp: GetJobStatusInput) -> CrawlToolResult:
    cancelled = await _job_cancelled(ctx)
    snap = ctx.snapshot()
    snap["cancelled_or_paused"] = cancelled
    return CrawlToolResult(content=json.dumps(snap, ensure_ascii=False))


async def _update_cover_url_tool(ctx: CrawlAgentContext, inp: UpdateCoverUrlInput) -> CrawlToolResult:
    cover = inp.cover_url.strip()
    if not cover.lower().startswith(("http://", "https://")):
        return CrawlToolResult(
            content=_json_err("cover_url 必须是 http(s) 绝对地址"),
            is_error=True,
        )

    catalog_id = ctx.catalog_novel_id
    if not catalog_id and ctx.job_id != "preview":
        job = await ctx.client.get_job(ctx.job_id)
        catalog_id = str(job.get("catalogNovelId") or "")
    if not catalog_id:
        return CrawlToolResult(
            content=_json_err(
                "任务未关联书库 catalogNovelId，无法 UpdateCoverUrl。"
                "全书入库请先 InitNovel；补封面任务需主编排 Create 时传入 catalog_novel_id"
            ),
            is_error=True,
        )

    if ctx.job_id != "preview":
        novel = await ctx.client.set_catalog_cover_by_id(catalog_id, cover_url=cover)
        ctx.catalog_novel_id = str(novel.get("id") or catalog_id)
        try:
            from app.crawl.agent.catalog_context import fetch_catalog_snapshot

            ctx.catalog_snapshot = await fetch_catalog_snapshot(ctx.client, ctx.catalog_novel_id)
        except Exception:
            pass
    await _append_log(ctx, "SUCCESS", f"UpdateCoverUrl · {cover[:160]}")
    return CrawlToolResult(
        content=_json_ok(catalog_novel_id=ctx.catalog_novel_id, cover_url=cover),
    )


async def _complete_job_tool(ctx: CrawlAgentContext, inp: CompleteJobInput) -> CrawlToolResult:
    catalog_id = ctx.catalog_novel_id
    if not catalog_id and ctx.job_id != "preview":
        job = await ctx.client.get_job(ctx.job_id)
        catalog_id = str(job.get("catalogNovelId") or "")

    if ctx.chapters_saved > 0 and not catalog_id:
        return CrawlToolResult(
            content=_json_err("已入库章节但未关联书库，请先 InitNovel"),
            is_error=True,
        )

    title = (ctx.novel_title or inp.message or ctx.goal or "完成").strip()[:200]
    if ctx.job_id != "preview":
        await ctx.client.complete_job(
            ctx.job_id,
            catalog_novel_id=catalog_id,
            title=title,
        )
    await _append_log(ctx, "SUCCESS", inp.message or title)
    ctx.end_success = True
    ctx.end_message = inp.message or title
    return CrawlToolResult(content=_json_ok(message=ctx.end_message), end_run=True)


async def _fail_job_tool(ctx: CrawlAgentContext, inp: FailJobInput) -> CrawlToolResult:
    await ctx.client.fail_job(ctx.job_id, error_message=inp.message[:500])
    await _append_log(ctx, "ERROR", inp.message)
    ctx.end_success = False
    ctx.end_message = inp.message
    return CrawlToolResult(content=_json_ok(message=inp.message), end_run=True)


def register_crawl_tools() -> None:
    global _REGISTERED
    if _REGISTERED:
        return
    _REGISTERED = True
    register_tool(
        CrawlTool(
            name="FetchPage",
            description=(
                "统一抓取引擎：HTTP/Stealth/Browser 自动升级，返回 HTML（追加到 RUN_CONTEXT）。"
                "目录发现优先用 MapLinks。"
            ),
            input_model=FetchPageInput,
            call=_fetch_page_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="MapLinks",
            description=(
                "抓取页面并返回结构化链接列表（章节/目录/分页分类），供 QueueChapters 使用。"
                "比直接读 HTML 更省 token。"
            ),
            input_model=MapLinksInput,
            call=_map_links_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="BrowserOpen",
            description=(
                "打开 Playwright 浏览器会话并导航到 URL（保持 Cookie/JS 状态）。"
                "需要点击菜单、搜索、SPA 站点时优先于 FetchPage。"
            ),
            input_model=BrowserOpenInput,
            call=_browser_open_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="BrowserClick",
            description="在当前浏览器页面按可见文字或 CSS 选择器点击，返回点击后的 HTML。",
            input_model=BrowserClickInput,
            call=_browser_click_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="BrowserGoto",
            description="在当前浏览器会话中跳转到 URL（保留会话状态）。",
            input_model=BrowserGotoInput,
            call=_browser_goto_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="BrowserSnapshot",
            description="获取当前浏览器页面的 HTML 快照（不导航）。",
            input_model=BrowserSnapshotInput,
            call=_browser_snapshot_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="UpdateCoverUrl",
            description=(
                "将封面图 URL 写入任务已关联的书库作品（catalogNovelId）。"
                "cover_url 须来自 RUN_CONTEXT 页面中的 img/og:image。"
                "仅补封面时用；不要与 QueueChapters 混用。"
            ),
            input_model=UpdateCoverUrlInput,
            call=_update_cover_url_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="QueueChapters",
            description=(
                "登记你从 RUN_CONTEXT 读到的章节列表（title/url/sort_order）。"
                "仅当子目标要求抓书/入库章节时使用。"
            ),
            input_model=QueueChaptersInput,
            call=_queue_chapters_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="InitNovel",
            description="初始化公共书库作品。全书入库流程中使用；补封面勿用。",
            input_model=InitNovelInput,
            call=_init_novel_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="FetchAndSaveChapter",
            description="抓取单章正文、AI 清洗并入库。按 sort_order 顺序执行。",
            input_model=FetchAndSaveChapterInput,
            call=_fetch_and_save_chapter_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="SaveQueuedChapters",
            description=(
                "批量保存 QueueChapters 队列中的章节（InitNovel 后调用，减少逐章 tool_call）。"
            ),
            input_model=SaveQueuedChaptersInput,
            call=_save_queued_chapters_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="GetJobStatus",
            description="查询任务进度、已发现/已保存章节数、是否被取消。",
            input_model=GetJobStatusInput,
            call=_get_job_status_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="CompleteJob",
            description="子目标达成后结束。message 写清结果（如发现类任务写明找到的 URL）。",
            input_model=CompleteJobInput,
            call=_complete_job_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="FailJob",
            description="无法完成目标时结束任务（失败）。",
            input_model=FailJobInput,
            call=_fail_job_tool,
        )
    )


# side-effect: register on import
register_crawl_tools()

from app.crawl.agent.tools import catalog_impl  # noqa: F401 — register catalog CRUD
