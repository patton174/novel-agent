"""Chapter CRUD via Content API — direct ID-based client."""

from app.agent.backend.chapter_store import (
    CHAPTER_TITLE_REQUIRED_MSG,
    chapter_to_markdown,
    delete_chapter,
    fetch_chapter_full,
    fetch_chapter_read_by_target,
    fetch_chapter_read_slice,
    fetch_chapter_summaries,
    format_persist_failure_message,
    iter_chapter_read_by_target_stream,
    iter_chapter_read_slice_stream,
    normalize_chapter_summary,
    persist_chapter_write,
    reorder_novel_chapters,
    resolve_chapter_row_api,
    update_chapter_sort_order,
)

__all__ = [
    "CHAPTER_TITLE_REQUIRED_MSG",
    "chapter_to_markdown",
    "delete_chapter",
    "fetch_chapter_full",
    "fetch_chapter_read_by_target",
    "fetch_chapter_read_slice",
    "fetch_chapter_summaries",
    "format_persist_failure_message",
    "iter_chapter_read_by_target_stream",
    "iter_chapter_read_slice_stream",
    "normalize_chapter_summary",
    "persist_chapter_write",
    "reorder_novel_chapters",
    "resolve_chapter_row_api",
    "update_chapter_sort_order",
]
