"""VFS path and read tests."""

from __future__ import annotations

import pytest

from app.agent_step.schemas import AgentRunContext
from app.agent_step.tool_execution import classify_tool_step_failure, is_recoverable_tool_execution_failure
from app.agent_step.vfs.paths import parse_vfs_path

NOVEL = "d071d83d-a058-441b-ab67-847131d3c69a"


def test_parse_rejects_novel_id_placeholder():
    vp, err = parse_vfs_path(
        "/novel/{novelId}/meta.json",
        expected_novel_id=NOVEL,
    )
    assert vp is None
    assert err is not None
    assert "does not match run novel" in err
    assert "vfs_root" in err


def test_vfs_input_error_is_recoverable_in_main_loop():
    is_fail, code, _detail = classify_tool_step_failure(
        "Read",
        None,
        executor_failed=True,
        executor_error=(
            "path novel id '{novelId}' does not match run novel "
            f"'{NOVEL}'"
        ),
    )
    assert is_fail
    assert code == "vfs_input"
    assert is_recoverable_tool_execution_failure(code)


def test_parse_chapters_directory_as_index():
    vp, err = parse_vfs_path(
        f"/novel/{NOVEL}/chapters/",
        expected_novel_id=NOVEL,
    )
    assert err is None
    assert vp is not None
    assert vp.kind == "chapter_index"


@pytest.mark.asyncio
async def test_read_chapters_directory_lists_index():
    from unittest.mock import AsyncMock, patch

    from app.agent_step.tools.cc.vfs_ops import vfs_read

    ctx = AgentRunContext(
        run_id="run-1",
        session_id="sess-1",
        message_id="msg-1",
        user_id=1,
        novel_id=NOVEL,
        user_message="hi",
        project={"id": NOVEL},
    )
    summaries = [{"id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "title": "Ch1"}]
    with patch(
        "app.agent_step.tools.cc.vfs_ops.chapter_store.fetch_chapter_summaries",
        new_callable=AsyncMock,
        return_value=summaries,
    ):
        text, err = await vfs_read(ctx, f"/novel/{NOVEL}/chapters/")
    assert err is None
    assert text is not None
    assert "Ch1" in text


def test_slice_text_locally_no_default_page_cap():
    from app.agent_step.tools.cc.vfs_ops import _slice_text_locally

    body = "\n".join(f"line{i}" for i in range(1, 50))
    text, _ = _slice_text_locally(body, offset=None, limit=None)
    assert "49\tline49" in text
    assert "Read 分页" not in text


@pytest.mark.asyncio
async def test_vfs_read_chapter_uses_content_api_slice():
    from unittest.mock import AsyncMock, patch

    from app.agent_step.tools.cc.vfs_ops import vfs_read

    ctx = AgentRunContext(
        run_id="run-1",
        session_id="sess-1",
        message_id="msg-1",
        user_id=1,
        novel_id=NOVEL,
        user_message="hi",
        project={"id": NOVEL},
    )
    cid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    path = f"/novel/{NOVEL}/chapters/{cid}.md"
    with patch(
        "app.agent_step.tools.cc.vfs_ops.chapter_store.fetch_chapter_read_slice",
        new_callable=AsyncMock,
        return_value=("     1\thello", None),
    ) as mock_slice:
        text, err = await vfs_read(ctx, path, offset=1, limit=100)
    assert err is None
    assert text == "     1\thello"
    mock_slice.assert_awaited_once_with(ctx, cid, offset=1, limit=150)


def test_parse_chapter_path():
    vp, err = parse_vfs_path(
        "/novel/novel-1/chapters/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.md",
        expected_novel_id="novel-1",
    )
    assert err is None
    assert vp is not None
    assert vp.kind == "chapter"
    assert vp.chapter_id == "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
