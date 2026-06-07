"""Persist / restore crawl agent runtime (chapter queue) in job configJson._runtime."""

from __future__ import annotations

import json
import logging
from typing import Any

from app.crawl_agent.context import ChapterItem, CrawlAgentContext

logger = logging.getLogger(__name__)


def parse_config_json(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return dict(raw)
    if isinstance(raw, str) and raw.strip():
        try:
            data = json.loads(raw)
            return data if isinstance(data, dict) else {}
        except json.JSONDecodeError:
            logger.debug("invalid configJson on job snapshot")
    return {}


def runtime_from_context(ctx: CrawlAgentContext) -> dict[str, Any]:
    return {
        "novelTitle": ctx.novel_title,
        "novelAuthor": ctx.novel_author,
        "novelDescription": ctx.novel_description,
        "sourceUrl": ctx.source_url,
        "catalogNovelId": ctx.catalog_novel_id,
        "chaptersSaved": ctx.chapters_saved,
        "chaptersQueue": [
            {
                "title": ch.title,
                "url": ch.url,
                "sortOrder": ch.sort_order,
            }
            for ch in ctx.chapters_queue
        ],
    }


def apply_runtime_to_context(ctx: CrawlAgentContext, runtime: dict[str, Any] | None) -> bool:
    if not runtime:
        return False

    if runtime.get("novelTitle"):
        ctx.novel_title = str(runtime["novelTitle"])
    if runtime.get("novelAuthor"):
        ctx.novel_author = str(runtime["novelAuthor"])
    if runtime.get("novelDescription"):
        ctx.novel_description = str(runtime["novelDescription"])
    if runtime.get("sourceUrl"):
        ctx.source_url = str(runtime["sourceUrl"])
    if runtime.get("catalogNovelId"):
        ctx.catalog_novel_id = str(runtime["catalogNovelId"])
    if isinstance(runtime.get("chaptersSaved"), int):
        ctx.chapters_saved = max(ctx.chapters_saved, int(runtime["chaptersSaved"]))

    queue_raw = runtime.get("chaptersQueue")
    if not isinstance(queue_raw, list) or not queue_raw:
        return False

    restored: list[ChapterItem] = []
    for item in queue_raw:
        if not isinstance(item, dict):
            continue
        url = str(item.get("url") or "").strip()
        if not url:
            continue
        sort_order = int(item.get("sortOrder") or item.get("sort_order") or 0)
        title = str(item.get("title") or f"第{sort_order}章").strip()[:200]
        restored.append(ChapterItem(title=title, url=url, sort_order=sort_order))

    if not restored:
        return False

    ctx.chapters_queue = sorted(restored, key=lambda c: c.sort_order)
    return True


async def persist_runtime(ctx: CrawlAgentContext) -> None:
    if ctx.job_id == "preview":
        return
    try:
        await ctx.client.save_runtime_state(ctx.job_id, runtime_from_context(ctx))
    except Exception as exc:
        logger.debug("persist crawl runtime failed jobId=%s: %s", ctx.job_id, exc)
