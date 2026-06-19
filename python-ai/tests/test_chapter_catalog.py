"""Tests for chapter row catalog helpers."""

from __future__ import annotations

import asyncio

from app.agent.schemas import AgentRunContext
from app.agent.tools.chapter_catalog import (
    chapter_row_meta,
    chapter_rows_patch,
    resolve_chapter_target,
)


def _ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="r",
        session_id="s",
        message_id="m",
        user_id=1,
        novel_id="n1",
        chapters=[
            {"id": "aaa", "title": "开篇", "sort_order": 1, "word_count": 100},
            {"id": "bbb", "title": "转折", "sort_order": 2, "word_count": 200},
        ],
    )


def test_chapter_rows_patch_assigns_list_index():
    rows = [
        {"id": "aaa", "title": "开篇", "sort_order": 1},
        {"id": "bbb", "title": "转折", "sort_order": 2},
    ]
    patch = chapter_rows_patch(rows)
    assert len(patch["chapters"]) == 2
    assert patch["chapters"][0]["list_index"] == 1
    assert patch["chapters"][1]["list_index"] == 2


def test_resolve_chapter_target_by_index():
    row, rows, err = asyncio.run(resolve_chapter_target(_ctx(), index=2))
    assert err is None
    assert row is not None
    assert chapter_row_meta(row)["chapter_id"] == "bbb"
    assert len(rows) == 2


def test_chapter_row_meta_fields():
    meta = chapter_row_meta({"id": "x", "title": "T", "list_index": 3, "sort_order": 3})
    assert meta["chapter_id"] == "x"
    assert meta["index"] == 3
    assert meta["title"] == "T"
