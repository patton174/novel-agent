"""referenced_books token budget truncation (P0-G8)."""

from __future__ import annotations

import json

from app.agent.context.prompting.run_context import (
    LIBRARY_BLOCK_MAX_CHARS,
    MAX_CHAPTER_TITLES,
    SUMMARY_MAX_CHARS,
    assemble_run_context,
)
from app.agent.schemas import AgentRunContext


def _ctx(referenced_books):
    return AgentRunContext(
        run_id="r",
        session_id="s",
        message_id="m",
        user_id=10,
        novel_id="novel-1",
        referenced_books=referenced_books,
    )


def test_summary_truncated_to_budget():
    long_summary = "摘" * (SUMMARY_MAX_CHARS + 200)
    out = assemble_run_context(
        _ctx(
            [
                {
                    "catalogNovelId": "c1",
                    "title": "书一",
                    "summary": long_summary,
                    "chapterTitles": ["第一章"],
                    "indexStatus": "indexed",
                }
            ]
        )
    )
    summary = out["library"]["books"][0]["summary"]
    assert len(summary) == SUMMARY_MAX_CHARS + 1
    assert summary.endswith("…")


def test_chapter_titles_truncated_with_more_marker():
    titles = [f"第{i}章" for i in range(1, MAX_CHAPTER_TITLES + 25)]
    out = assemble_run_context(
        _ctx(
            [
                {
                    "catalogNovelId": "c1",
                    "title": "书一",
                    "summary": "简介",
                    "chapterTitles": titles,
                    "indexStatus": "indexed",
                }
            ]
        )
    )
    rendered = out["library"]["books"][0]["chapter_titles"]
    assert len(rendered) == MAX_CHAPTER_TITLES + 1
    assert rendered[-1] == "…(+24 more)"


def test_library_block_respects_total_char_budget():
    books = []
    for i in range(20):
        books.append(
            {
                "catalogNovelId": f"c{i}",
                "title": f"参考书{i:02d}",
                "summary": "长摘要" * 120,
                "chapterTitles": [f"第{j}章" for j in range(1, 41)],
                "indexStatus": "indexed",
            }
        )
    out = assemble_run_context(_ctx(books))
    rendered = out["library"]["books"]
    assert len(rendered) < len(books)
    assert len(json.dumps(out["library"], ensure_ascii=False)) <= LIBRARY_BLOCK_MAX_CHARS
