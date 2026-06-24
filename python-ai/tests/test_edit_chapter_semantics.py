"""EditChapter P3.1: new_content full-replace, new_title rename, fatal/empty edits."""

from __future__ import annotations

import asyncio
import json
from typing import Any

import pytest

from app.agent.tools import chapter as chapter_tool
from app.agent.tools import chapter_catalog
from app.agent.tools.errors import ToolErrorCode, extract_error_code
from app.agent.tools.schemas import EditChapterInput
from app.agent.schemas import AgentRunContext


def _ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="run_edit",
        session_id="sess_edit",
        message_id="msg_edit",
        user_id=1,
        mode="auto",
        user_message="改章",
        novel_id="novel-1",
    )


_ROW = {"id": "ch-1", "title": "旧标题", "sort_order": 1, "word_count": 3}
_FULL = {"id": "ch-1", "title": "旧标题", "content": "原始正文内容", "sort_order": 1}


@pytest.fixture
def patched(monkeypatch):
    """Mock catalog resolve + Content API persist; capture the persisted payload."""
    captured: dict[str, Any] = {}

    async def _load_rows(_ctx):
        return [dict(_ROW)]

    async def _resolve_target(
        _ctx,
        *,
        chapter_id: str | None = None,
        title: str | None = None,
        index: int | None = None,
    ):
        from app.agent.tools.chapter_resolve import resolve_chapter_row

        rows = await _load_rows(_ctx)
        row, err = resolve_chapter_row(
            rows, chapter_id=chapter_id, title=title, index=index
        )
        return row, rows, err

    async def _full(_ctx, _cid):
        return dict(_FULL)

    async def _persist(_ctx, payload):
        captured["payload"] = payload
        return True, {"persisted": True, **payload}, ""

    async def _update_title(_ctx, _cid, title):
        captured["title"] = title
        return True, ""

    async def _patch_lines(_ctx, _cid, *, line_start, line_end, line_content):
        captured["patch"] = {
            "line_start": line_start,
            "line_end": line_end,
            "line_content": line_content,
        }
        return True, {"chapter_id": _cid, "content": line_content}, ""

    monkeypatch.setattr(chapter_catalog, "load_chapter_rows", _load_rows)
    monkeypatch.setattr(chapter_tool, "resolve_chapter_target", _resolve_target)
    monkeypatch.setattr(chapter_tool.chapter_client, "fetch_chapter_full", _full)
    monkeypatch.setattr(chapter_tool.chapter_client, "persist_chapter_write", _persist)
    monkeypatch.setattr(chapter_tool.chapter_client, "update_chapter_title", _update_title)
    monkeypatch.setattr(chapter_tool.chapter_client, "patch_chapter_lines", _patch_lines)
    return captured


def test_new_content_full_replace(patched):
    out = asyncio.run(
        chapter_tool.edit_chapter(
            _ctx(), EditChapterInput(chapter_id="ch-1", new_content="全新的整章正文")
        )
    )
    assert not out.is_error
    assert patched["payload"]["content"].strip() == "全新的整章正文"
    # Title unchanged when not renaming.
    assert patched["payload"]["title"] == "旧标题"
    assert json.loads(out.content)["ok"] is True


def test_new_title_rename_keeps_body(patched):
    out = asyncio.run(
        chapter_tool.edit_chapter(
            _ctx(), EditChapterInput(chapter_id="ch-1", new_title="崭新标题")
        )
    )
    assert not out.is_error
    assert patched["title"] == "崭新标题"
    assert "payload" not in patched


def test_new_content_and_rename_together(patched):
    out = asyncio.run(
        chapter_tool.edit_chapter(
            _ctx(),
            EditChapterInput(
                chapter_id="ch-1", new_content="改写后的正文", new_title="改写标题"
            ),
        )
    )
    assert not out.is_error
    assert patched["payload"]["title"] == "改写标题"
    assert patched["payload"]["content"].strip() == "改写后的正文"


def test_nothing_to_edit_is_schema_invalid(patched):
    with pytest.raises(Exception):
        EditChapterInput(chapter_id="ch-1")


def test_same_title_rename_is_no_op(patched):
    out = asyncio.run(
        chapter_tool.edit_chapter(
            _ctx(), EditChapterInput(chapter_id="ch-1", new_title="旧标题")
        )
    )
    assert out.is_error
    assert extract_error_code(out.content) == ToolErrorCode.SCHEMA_INVALID
    assert "payload" not in patched


def test_line_range_edit(patched):
    out = asyncio.run(
        chapter_tool.edit_chapter(
            _ctx(),
            EditChapterInput(
                chapter_id="ch-1",
                line_start=1,
                line_content="修改后的首行",
            ),
        )
    )
    assert not out.is_error
    assert patched["patch"]["line_start"] == 1
    assert patched["patch"]["line_content"] == "修改后的首行"


def test_line_edit_out_of_range(patched, monkeypatch):
    async def _fail_patch(*_a, **_k):
        return False, {}, "lineStart out of range (1-1)"

    monkeypatch.setattr(chapter_tool.chapter_client, "patch_chapter_lines", _fail_patch)
    out = asyncio.run(
        chapter_tool.edit_chapter(
            _ctx(),
            EditChapterInput(
                chapter_id="ch-1",
                line_start=99,
                line_content="X",
            ),
        )
    )
    assert out.is_error
    assert extract_error_code(out.content) == ToolErrorCode.SCHEMA_INVALID
