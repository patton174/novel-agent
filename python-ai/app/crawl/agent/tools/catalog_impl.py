"""Catalog CRUD tools for crawl agent."""

from __future__ import annotations

from app.crawl.agent.catalog_context import fetch_catalog_snapshot
from app.crawl.agent.context import CrawlAgentContext
from app.crawl.agent.tools.base import append_log as _append_log
from app.crawl.agent.tools.base import json_err as _json_err
from app.crawl.agent.tools.base import json_ok as _json_ok
from app.crawl.agent.tools.catalog_schemas import (
    AddCatalogChapterInput,
    CatalogNovelIdInput,
    DeleteCatalogChapterInput,
    DeleteCatalogNovelInput,
    GetCatalogChapterInput,
    ListCatalogChaptersInput,
    ListCatalogNovelsInput,
    UpdateCatalogChapterInput,
    UpdateCatalogNovelInput,
)
from app.crawl.agent.tools.registry import register_tool
from app.crawl.agent.tools.tool import CrawlTool, CrawlToolResult

_REGISTERED = False
_DETAIL_PREVIEW = 1200


async def _resolve_catalog_id(ctx: CrawlAgentContext, raw: str = "") -> str:
    cid = (raw or ctx.catalog_novel_id or "").strip()
    if cid or ctx.job_id == "preview":
        return cid
    job = await ctx.client.get_job(ctx.job_id)
    return str(job.get("catalogNovelId") or "") if job else ""


def _missing_catalog_err() -> CrawlToolResult:
    return CrawlToolResult(
        content=_json_err(
            "缺少 catalogNovelId。全书入库请先 InitNovel；"
            "或 ListCatalogNovels 查 ID，或在参数中显式传入 catalog_novel_id"
        ),
        is_error=True,
    )


async def _refresh_catalog_snapshot(ctx: CrawlAgentContext, catalog_id: str) -> None:
    if ctx.job_id == "preview":
        return
    try:
        ctx.catalog_snapshot = await fetch_catalog_snapshot(ctx.client, catalog_id)
        ctx.catalog_novel_id = catalog_id
    except Exception:
        pass


async def _list_catalog_novels_tool(ctx: CrawlAgentContext, inp: ListCatalogNovelsInput) -> CrawlToolResult:
    page = await ctx.client.page_catalog_novels(
        page_current=inp.page_current,
        page_size=inp.page_size,
    )
    await _append_log(ctx, "INFO", f"ListCatalogNovels · 第 {inp.page_current} 页")
    return CrawlToolResult(content=_json_ok(**page))


async def _get_catalog_novel_tool(ctx: CrawlAgentContext, inp: CatalogNovelIdInput) -> CrawlToolResult:
    catalog_id = await _resolve_catalog_id(ctx, inp.catalog_novel_id)
    if not catalog_id:
        return _missing_catalog_err()
    novel = await ctx.client.get_catalog_novel(catalog_id)
    await _refresh_catalog_snapshot(ctx, catalog_id)
    await _append_log(ctx, "INFO", f"GetCatalogNovel · {catalog_id}")
    return CrawlToolResult(content=_json_ok(novel=novel))


async def _get_catalog_progress_tool(ctx: CrawlAgentContext, inp: CatalogNovelIdInput) -> CrawlToolResult:
    catalog_id = await _resolve_catalog_id(ctx, inp.catalog_novel_id)
    if not catalog_id:
        return _missing_catalog_err()
    progress = await ctx.client.get_catalog_progress(catalog_id)
    await _append_log(ctx, "INFO", f"GetCatalogProgress · {catalog_id}")
    return CrawlToolResult(content=_json_ok(progress=progress))


async def _update_catalog_novel_tool(ctx: CrawlAgentContext, inp: UpdateCatalogNovelInput) -> CrawlToolResult:
    catalog_id = await _resolve_catalog_id(ctx, inp.catalog_novel_id)
    if not catalog_id:
        return _missing_catalog_err()
    novel = await ctx.client.update_catalog_novel(
        catalog_id,
        title=inp.title,
        author=inp.author,
        description=inp.description,
        cover_url=inp.cover_url,
        source_url=inp.source_url,
    )
    await _refresh_catalog_snapshot(ctx, catalog_id)
    await _append_log(ctx, "SUCCESS", f"UpdateCatalogNovel · {catalog_id}")
    return CrawlToolResult(content=_json_ok(novel=novel))


async def _delete_catalog_novel_tool(ctx: CrawlAgentContext, inp: DeleteCatalogNovelInput) -> CrawlToolResult:
    catalog_id = inp.catalog_novel_id.strip()
    result = await ctx.client.delete_catalog_novel(catalog_id)
    if ctx.catalog_novel_id == catalog_id:
        ctx.catalog_novel_id = ""
        ctx.catalog_snapshot = None
    await _append_log(ctx, "WARN", f"DeleteCatalogNovel · {catalog_id}")
    return CrawlToolResult(content=_json_ok(**result))


async def _list_catalog_chapters_tool(ctx: CrawlAgentContext, inp: ListCatalogChaptersInput) -> CrawlToolResult:
    catalog_id = await _resolve_catalog_id(ctx, inp.catalog_novel_id)
    if not catalog_id:
        return _missing_catalog_err()
    chapters = await ctx.client.list_catalog_chapters(catalog_id)
    await _append_log(ctx, "INFO", f"ListCatalogChapters · {len(chapters)} 章 · {catalog_id}")
    return CrawlToolResult(content=_json_ok(catalog_novel_id=catalog_id, chapters=chapters))


async def _get_catalog_chapter_tool(ctx: CrawlAgentContext, inp: GetCatalogChapterInput) -> CrawlToolResult:
    catalog_id = await _resolve_catalog_id(ctx, inp.catalog_novel_id)
    if not catalog_id:
        return _missing_catalog_err()
    chapter = await ctx.client.get_catalog_chapter(catalog_id, inp.chapter_id.strip())
    content = str(chapter.get("content") or "")
    preview = {
        **chapter,
        "content": content[:_DETAIL_PREVIEW],
        "contentChars": len(content),
    }
    await _append_log(ctx, "INFO", f"GetCatalogChapter · {inp.chapter_id}")
    return CrawlToolResult(content=_json_ok(chapter=preview))


async def _add_catalog_chapter_tool(ctx: CrawlAgentContext, inp: AddCatalogChapterInput) -> CrawlToolResult:
    catalog_id = await _resolve_catalog_id(ctx, inp.catalog_novel_id)
    if not catalog_id:
        return _missing_catalog_err()
    chapter = await ctx.client.add_catalog_chapter(
        catalog_id,
        title=inp.title.strip(),
        content=inp.content,
        sort_order=inp.sort_order,
        source_url=inp.source_url.strip(),
    )
    await _refresh_catalog_snapshot(ctx, catalog_id)
    await _append_log(ctx, "SUCCESS", f"AddCatalogChapter · 第{inp.sort_order}章 · {inp.title[:40]}")
    return CrawlToolResult(content=_json_ok(chapter=chapter))


async def _update_catalog_chapter_tool(
    ctx: CrawlAgentContext,
    inp: UpdateCatalogChapterInput,
) -> CrawlToolResult:
    catalog_id = await _resolve_catalog_id(ctx, inp.catalog_novel_id)
    if not catalog_id:
        return _missing_catalog_err()
    chapter = await ctx.client.update_catalog_chapter(
        catalog_id,
        inp.chapter_id.strip(),
        title=inp.title,
        content=inp.content,
        sort_order=inp.sort_order,
        source_url=inp.source_url,
    )
    await _refresh_catalog_snapshot(ctx, catalog_id)
    await _append_log(ctx, "SUCCESS", f"UpdateCatalogChapter · {inp.chapter_id}")
    return CrawlToolResult(content=_json_ok(chapter=chapter))


async def _delete_catalog_chapter_tool(
    ctx: CrawlAgentContext,
    inp: DeleteCatalogChapterInput,
) -> CrawlToolResult:
    catalog_id = await _resolve_catalog_id(ctx, inp.catalog_novel_id)
    if not catalog_id:
        return _missing_catalog_err()
    result = await ctx.client.delete_catalog_chapter(catalog_id, inp.chapter_id.strip())
    await _refresh_catalog_snapshot(ctx, catalog_id)
    await _append_log(ctx, "WARN", f"DeleteCatalogChapter · {inp.chapter_id}")
    return CrawlToolResult(content=_json_ok(**result))


def register_catalog_tools() -> None:
    global _REGISTERED
    if _REGISTERED:
        return
    _REGISTERED = True

    register_tool(
        CrawlTool(
            name="ListCatalogNovels",
            description="分页列出公共书库作品（查 id/书名/章节数/封面）。",
            input_model=ListCatalogNovelsInput,
            call=_list_catalog_novels_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="GetCatalogNovel",
            description="读取单本书库作品元数据（title/author/coverUrl/sourceUrl/chapterCount）。",
            input_model=CatalogNovelIdInput,
            call=_get_catalog_novel_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="GetCatalogProgress",
            description="读取书库作品爬取进度（chaptersDone/chaptersExpected/complete/latestJob）。",
            input_model=CatalogNovelIdInput,
            call=_get_catalog_progress_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="UpdateCatalogNovel",
            description="更新书库作品元数据（书名/作者/简介/封面/来源 URL，传哪些改哪些）。",
            input_model=UpdateCatalogNovelInput,
            call=_update_catalog_novel_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="DeleteCatalogNovel",
            description="删除书库作品及其全部章节（不可逆，慎用）。",
            input_model=DeleteCatalogNovelInput,
            call=_delete_catalog_novel_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="ListCatalogChapters",
            description="列出书库作品全部章节摘要（id/title/sortOrder/wordCount/sourceUrl）。",
            input_model=ListCatalogChaptersInput,
            call=_list_catalog_chapters_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="GetCatalogChapter",
            description="读取单章详情（含正文 content，过长会截断预览）。",
            input_model=GetCatalogChapterInput,
            call=_get_catalog_chapter_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="AddCatalogChapter",
            description="直接向书库添加一章（已有正文时用；从网页抓正文可配合 FetchPage + extract 或 SaveQueuedChapters）。",
            input_model=AddCatalogChapterInput,
            call=_add_catalog_chapter_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="UpdateCatalogChapter",
            description="更新书库章节（title/content/sortOrder/sourceUrl，传哪些改哪些）。",
            input_model=UpdateCatalogChapterInput,
            call=_update_catalog_chapter_tool,
        )
    )
    register_tool(
        CrawlTool(
            name="DeleteCatalogChapter",
            description="删除书库中的单章。",
            input_model=DeleteCatalogChapterInput,
            call=_delete_catalog_chapter_tool,
        )
    )


register_catalog_tools()
