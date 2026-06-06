"""Crawl agent tool implementations — Scrapling fetch + Content API side effects."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from app.crawl_agent.context import ChapterItem, CrawlAgentContext
from app.crawl_agent.tools.registry import register_tool
from app.crawl_agent.tools.schemas import (
    CompleteJobInput,
    FailJobInput,
    FetchAndSaveChapterInput,
    FetchPageInput,
    GetJobStatusInput,
    InitNovelInput,
    QueueChaptersInput,
    SaveQueuedChaptersInput,
)
from app.crawl_agent.tools.tool import CrawlTool, CrawlToolResult
from app.services.crawl_ai_extractor import extract_chapter
from app.services.crawl_fetch import fetch_for_crawl, resolve_crawl_url
from app.services.crawl_proxy import mask_proxy_url, pick_crawl_proxy
from app.services.crawl_scrapling import page_links, page_text

_REGISTERED = False


async def _append_log(ctx: CrawlAgentContext, level: str, message: str) -> None:
    if ctx.job_id == "preview":
        return
    await ctx.client.append_log(ctx.job_id, level=level, message=message)


async def _job_cancelled(ctx: CrawlAgentContext) -> bool:
    if ctx.job_id == "preview":
        return False
    job = await ctx.client.get_job(ctx.job_id)
    if not job:
        return True
    return str(job.get("status") or "").upper() in {"CANCELLED", "PAUSED"}


def _json_ok(**payload: Any) -> str:
    return json.dumps({"ok": True, **payload}, ensure_ascii=False)


def _json_err(message: str, **payload: Any) -> str:
    return json.dumps({"ok": False, "error": message, **payload}, ensure_ascii=False)


def _crawl_proxy(ctx: CrawlAgentContext) -> str | None:
    return pick_crawl_proxy(ctx.site_config)


async def _fetch_page_tool(ctx: CrawlAgentContext, inp: FetchPageInput) -> CrawlToolResult:
    stealth_override = inp.use_stealth
    target = resolve_crawl_url(ctx, inp.url.strip())
    proxy = _crawl_proxy(ctx)
    proxy_hint = mask_proxy_url(proxy)
    log_suffix = f" · 代理 {proxy_hint}" if proxy_hint else ""
    await _append_log(ctx, "INFO", f"FetchPage: {target}{log_suffix}")

    page, meta = await asyncio.to_thread(
        fetch_for_crawl,
        ctx,
        target,
        stealth=stealth_override,
        auto_stealth=stealth_override is None,
        use_cache=False,
    )
    ctx.last_fetched_url = target
    links = page_links(page, target, limit=200)
    body = page_text(page, 16_000)

    if meta.blocked:
        msg = meta.hint or f"HTTP {meta.http_status}，无法获取有效页面内容"
        await _append_log(
            ctx,
            "ERROR",
            f"FetchPage 失败 · HTTP {meta.http_status} · {msg}",
        )
        return CrawlToolResult(
            content=_json_err(
                msg,
                url=target,
                http_status=meta.http_status,
                used_stealth=meta.used_stealth,
                content=body[:1500],
                links=links,
            ),
            is_error=True,
            context_patch={
                "append_note": f"FetchPage 失败 ({target}): {msg}",
            },
        )

    if meta.used_stealth and stealth_override is None:
        await _append_log(ctx, "INFO", "已自动切换 Stealth 浏览器抓取（后续抓取将沿用）")
    elif meta.http_status >= 300:
        await _append_log(ctx, "WARN", f"FetchPage HTTP {meta.http_status} · {len(body)} 字 · {len(links)} 链接")

    return CrawlToolResult(
        content=_json_ok(
            url=target,
            http_status=meta.http_status,
            used_stealth=meta.used_stealth,
            content=body,
            links=links,
            link_count=len(links),
            note=(
                "正文已追加至 RUN_CONTEXT。请阅读 content 决定下一 URL；"
                "links 仅为辅助索引，可能不完整，不可依赖工具替你解析全站目录。"
            ),
        ),
        context_patch={
            "append_page": {
                "url": target,
                "content": body,
                "links_index": links,
            }
        },
    )


async def _queue_chapters_tool(ctx: CrawlAgentContext, inp: QueueChaptersInput) -> CrawlToolResult:
    limit = ctx.max_chapters
    incoming = inp.chapters[:limit]
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
    extracted = await extract_chapter(page, inp.url, fallback_title=inp.title_hint)
    result = await ctx.client.import_chapter(
        ctx.job_id,
        title=extracted.title,
        content=extracted.content,
        sort_order=inp.sort_order,
        source_url=inp.url,
    )
    ctx.catalog_novel_id = str(result.get("catalogNovelId") or ctx.catalog_novel_id)
    ctx.chapters_saved = max(ctx.chapters_saved, inp.sort_order)
    await ctx.client.update_progress(ctx.job_id, chapters_done=ctx.chapters_saved)
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

    start = max(inp.start_from, ctx.chapters_saved + 1)
    cap = inp.max_count or min(20, ctx.max_chapters)
    pending = [c for c in ctx.chapters_queue if c.sort_order >= start][:cap]
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
            page, meta = await asyncio.to_thread(fetch_for_crawl, ctx, ch.url)
            if meta.blocked:
                raise ValueError(meta.hint or f"HTTP {meta.http_status}")
            extracted = await extract_chapter(page, ch.url, fallback_title=ch.title)
            if ctx.job_id != "preview":
                result = await ctx.client.import_chapter(
                    ctx.job_id,
                    title=extracted.title,
                    content=extracted.content,
                    sort_order=ch.sort_order,
                    source_url=ch.url,
                )
                ctx.catalog_novel_id = str(result.get("catalogNovelId") or ctx.catalog_novel_id)
            ctx.chapters_saved = max(ctx.chapters_saved, ch.sort_order)
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


async def _complete_job_tool(ctx: CrawlAgentContext, inp: CompleteJobInput) -> CrawlToolResult:
    catalog_id = ctx.catalog_novel_id
    if not catalog_id:
        job = await ctx.client.get_job(ctx.job_id)
        catalog_id = str(job.get("catalogNovelId") or "")
    if not catalog_id:
        return CrawlToolResult(content=_json_err("尚未入库任何章节，无法 CompleteJob"), is_error=True)
    await ctx.client.complete_job(
        ctx.job_id,
        catalog_novel_id=catalog_id,
        title=ctx.novel_title or "未命名",
    )
    await _append_log(ctx, "SUCCESS", inp.message)
    ctx.end_success = True
    ctx.end_message = inp.message
    return CrawlToolResult(content=_json_ok(message=inp.message), end_run=True)


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
                "抓取 URL，返回正文 content 与参考 links（追加到 RUN_CONTEXT）。"
                "由你阅读正文决定下一步；工具不会替你解析站点结构。"
            ),
            input_model=FetchPageInput,
            call=_fetch_page_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="QueueChapters",
            description=(
                "登记你从 RUN_CONTEXT 正文中读到的章节列表（title/url/sort_order）。"
                "不会替你解析网站；必须先 FetchPage 读到目录再提交。"
            ),
            input_model=QueueChaptersInput,
            call=_queue_chapters_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="InitNovel",
            description="初始化公共书库作品（书名/作者来自你已读页面；Save 之前调用一次）。",
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
            description="全部目标完成后结束任务（成功）。",
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
