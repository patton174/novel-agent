"""Chapter count limits — 0 means unlimited."""

from __future__ import annotations


def effective_chapter_cap(max_chapters: int) -> int | None:
    return None if max_chapters <= 0 else max_chapters


def slice_chapters(chapters: list, max_chapters: int) -> list:
    cap = effective_chapter_cap(max_chapters)
    if cap is None:
        return chapters
    return chapters[:cap]


def batch_save_count(max_chapters: int, requested: int | None = None) -> int:
    if requested is not None and requested > 0:
        return requested
    if max_chapters <= 0:
        return 20
    return min(20, max_chapters)
