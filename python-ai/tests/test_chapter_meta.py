from app.agent.schemas import AgentRunContext
from app.agent.backend.chapter_meta import (
    format_chapter_display_label,
    resolve_chapter_write_meta,
    sorted_chapter_summaries,
)


def test_sorted_chapter_summaries_assigns_list_index():
    chapters = [
        {"id": "a", "title": "第5章 初入社会", "sort_order": 5},
        {"id": "b", "title": "第2章 开端", "sort_order": 2},
    ]
    ordered = sorted_chapter_summaries(chapters)
    assert ordered[0]["id"] == "b"
    assert ordered[0]["list_index"] == 1
    assert ordered[1]["id"] == "a"
    assert ordered[1]["list_index"] == 2


def test_display_label_separates_title_from_list_index():
    label = format_chapter_display_label(
        "第5章 初入社会",
        list_index=2,
        sort_order=5,
    )
    assert "第5章" in label
    assert "作品列表第2章" in label
    assert "sort_order=5" in label


def test_resolve_chapter_write_meta_from_ctx():
    ctx = AgentRunContext(
        run_id="run_test",
        session_id="sess",
        message_id="msg",
        user_id=1,
        novel_id="novel-1",
        mode="write",
        user_message="写",
        chapters=[
            {"id": "cid-1", "title": "第5章 测试", "sort_order": 5},
            {"id": "cid-2", "title": "第2章 前情", "sort_order": 2},
        ],
    )
    meta = resolve_chapter_write_meta(ctx, chapter_id="cid-1", title="第5章 测试")
    assert meta["list_index"] == 2
    assert "作品列表第2章" in meta["display_label"]
