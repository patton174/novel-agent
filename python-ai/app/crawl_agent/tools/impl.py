"""Crawl agent tool implementations — Scrapling fetch + Content API side effects."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from app.crawl_agent.context import ChapterItem, CrawlAgentContext
from app.crawl_agent.tools.registry import register_tool
from app.crawl_agent.tools.schemas import (
    CompleteJobInput,
    DiscoverChaptersInput,
    FailJobInput,
    FetchAndSaveChapterInput,
    FetchPageInput,
    GetJobStatusInput,
    InitNovelInput,
    SaveQueuedChaptersInput,
)
from app.crawl_agent.tools.tool import CrawlTool, CrawlToolResult
from app.services.crawl_ai_extractor import discover_catalog, extract_chapter
from app.services.crawl_scrapling import fetch_page, page_links, page_text
from urllib.parse import urljoin

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


async def _fetch_page_tool(ctx: CrawlAgentContext, inp: FetchPageInput) -> CrawlToolResult:
    stealth = ctx.use_stealth if inp.use_stealth is None else inp.use_stealth
    target = urljoin(ctx.entry_url, inp.url.strip())
    await _append_log(ctx, "INFO", f"FetchPage: {target}")
    page = await asyncio.to_thread(fetch_page, target, stealth=stealth)
    ctx.last_fetched_url = target
    links = page_links(page, target, limit=120)
    body = page_text(page, 12_000)

    return CrawlToolResult(
        content=_json_ok(
            url=target,
            content=body,
            links=links,
            link_count=len(links),
            note="正文已追加至 RUN_CONTEXT，请阅读 content 与 links 后再决定下一工具",
        ),
        context_patch={
            "append_page": {
                "url": target,
                "content": body,
                "links_index": links,
            }
        },
    )


async def _discover_chapters_tool(ctx: CrawlAgentContext, inp: DiscoverChaptersInput) -> CrawlToolResult:
    limit = inp.max_chapters or ctx.max_chapters
    await _append_log(ctx, "INFO", f"DiscoverChapters: {inp.url}")

    def fetch_fn(url: str):
        return fetch_page(url, stealth=ctx.use_stealth)

    page = await asyncio.to_thread(fetch_page, inp.url, stealth=ctx.use_stealth)

    async def on_hop(msg: str) -> None:
        await _append_log(ctx, "INFO", msg)

    try:
        catalog = await discover_catalog(
            page,
            inp.url,
            max_chapters=limit,
            fetch_page=fetch_fn,
            on_hop=on_hop,
        )
    except ValueError as exc:
        return CrawlToolResult(content=_json_err(str(exc)), is_error=True)

    chapters = catalog.chapters[:limit]
    ctx.novel_title = catalog.novel_title
    ctx.novel_author = catalog.author
    ctx.novel_description = catalog.description
    ctx.source_url = inp.url
    ctx.chapters_queue = [
        ChapterItem(title=c.title, url=c.url, sort_order=i)
        for i, c in enumerate(chapters, start=1)
    ]
    if ctx.job_id != "preview":
        await ctx.client.update_progress(
            ctx.job_id,
            title=catalog.novel_title,
            chapters_total=len(chapters),
            chapters_done=ctx.chapters_saved,
        )
    preview = [{"sort_order": c.sort_order, "title": c.title, "url": c.url} for c in ctx.chapters_queue[:15]]
    await _append_log(
        ctx,
        "SUCCESS",
        f"识别《{catalog.novel_title}》共 {len(chapters)} 章",
    )
    return CrawlToolResult(
        content=_json_ok(
            novel_title=catalog.novel_title,
            author=catalog.author,
            chapter_count=len(chapters),
            chapters_preview=preview,
            next_step="调用 InitNovel，再 SaveQueuedChapters",
        ),
        context_patch={
            "append_catalog": {
                "url": inp.url,
                "title": catalog.novel_title,
                "author": catalog.author,
                "chapter_count": len(chapters),
                "chapters_preview": preview,
            }
        },
    )


async def _init_novel_tool(ctx: CrawlAgentContext, inp: InitNovelInput) -> CrawlToolResult:
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

    page = await asyncio.to_thread(fetch_page, inp.url, stealth=ctx.use_stealth)
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
        return CrawlToolResult(content=_json_err("章节队列为空，请先 DiscoverChapters"), is_error=True)

    if await _job_cancelled(ctx):
        return CrawlToolResult(content=_json_err("任务已暂停或取消"), is_error=True, end_run=True)

    if not ctx.catalog_novel_id and ctx.job_id != "preview":
        job = await ctx.client.get_job(ctx.job_id)
        ctx.catalog_novel_id = str(job.get("catalogNovelId") or "")

    start = max(inp.start_from, ctx.chapters_saved + 1)
    cap = inp.max_count or ctx.max_chapters
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
    await _append_log(ctx, "INFO", f"SaveQueuedChapters: 批量保存 {len(pending)} 章（从第 {start} 章）")
    saved = 0
    errors: list[str] = []

    for ch in pending:
        if await _job_cancelled(ctx):
            break
        try:
            page = await asyncio.to_thread(fetch_page, ch.url, stealth=ctx.use_stealth)
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
                "抓取 URL 对应页面的正文与页内链接；正文会追加注入 RUN_CONTEXT。"
                "决策前必须先阅读返回的 content。"
            ),
            input_model=FetchPageInput,
            call=_fetch_page_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="DiscoverChapters",
            description=(
                "在书籍/目录/章节列表页识别元数据与章节 URL 列表，写入任务队列。"
                "若当前页无章节，会尝试 AI 跳转目录页。"
            ),
            input_model=DiscoverChaptersInput,
            call=_discover_chapters_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="InitNovel",
            description="初始化公共书库作品（DiscoverChapters 之后、Save 之前调用一次）。",
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
                "批量保存 DiscoverChapters 队列中的章节（推荐：InitNovel 后一次调用，"
                "避免逐章 tool_call 耗尽轮次）。"
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
