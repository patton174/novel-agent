"""Chapter count limits — 0 means unlimited."""

from __future__ import annotations

from app.crawl.config import get_crawl_limits


def effective_chapter_cap(max_chapters: int) -> int | None:
    return None if max_chapters <= 0 else max_chapters


def slice_chapters(chapters: list, max_chapters: int) -> list:
    cap = effective_chapter_cap(max_chapters)
    if cap is None:
        return chapters
    return chapters[:cap]


def batch_save_count(max_chapters: int, requested: int | None = None) -> int:
    default_batch = get_crawl_limits().batch_save
    if requested is not None and requested > 0:
        return requested
    if max_chapters <= 0:
        return default_batch
    return min(default_batch, max_chapters)
