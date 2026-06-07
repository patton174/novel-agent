"""Preload catalog snapshot for crawl agent RUN_CONTEXT."""

from __future__ import annotations

import json
from typing import Any

from app.services.crawl_content_client import CrawlContentClient

_CHAPTER_PREVIEW = 50
_CONTENT_PREVIEW = 400


def _compact_chapter(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item.get("id"),
        "title": item.get("title"),
        "sortOrder": item.get("sortOrder"),
        "wordCount": item.get("wordCount"),
        "sourceUrl": item.get("sourceUrl"),
    }


def _compact_chapter_detail(item: dict[str, Any]) -> dict[str, Any]:
    content = str(item.get("content") or "")
    return {
        **_compact_chapter(item),
        "contentPreview": content[:_CONTENT_PREVIEW],
        "contentChars": len(content),
    }


async def fetch_catalog_snapshot(
    client: CrawlContentClient,
    catalog_novel_id: str,
    *,
    include_chapters: bool = True,
) -> dict[str, Any]:
    novel = await client.get_catalog_novel(catalog_novel_id)
    progress = await client.get_catalog_progress(catalog_novel_id)
    snapshot: dict[str, Any] = {
        "novel": novel,
        "progress": progress,
    }
    if include_chapters:
        chapters = await client.list_catalog_chapters(catalog_novel_id)
        if isinstance(chapters, list):
            snapshot["chapterCount"] = len(chapters)
            snapshot["chapters"] = [_compact_chapter(c) for c in chapters[:_CHAPTER_PREVIEW]]
            if len(chapters) > _CHAPTER_PREVIEW:
                snapshot["chaptersTruncated"] = True
    return snapshot


def format_catalog_snapshot(snapshot: dict[str, Any] | None) -> str:
    if not snapshot:
        return "（未关联书库作品）"
    return json.dumps(snapshot, ensure_ascii=False, indent=2)
