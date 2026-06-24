"""Tests for compact agent context assembly."""

from app.agent.context.compact import (
    chapter_has_substantial_body,
    ctx_with_write_anchor,
    effective_chapter_text,
    format_chapter_catalog_db,
    format_chapter_window,
    is_onboarding_assistant_text,
)
from app.agent.context.prompting.run_context import assemble_agent_context
from app.agent.harness.routing import has_writing_context, story_context_for_chapter_create
from app.agent.schemas import AgentRunContext


def _ctx(**overrides) -> AgentRunContext:
    base = {
        "run_id": "r1",
        "session_id": "s1",
        "message_id": "m1",
        "user_id": 1,
        "mode": "world",
        "user_message": "优化角色库",
    }
    base.update(overrides)
    return AgentRunContext(**base)


GREETING = (
    "你好！当前正在创作《开局无限掉宝》。\n\n"
    "我已读取本书简介/设定，会据此续写与扩展世界观。\n\n"
    "描述场景、人物或情节，我可以帮你续写；切换到「世界观」模式可系统化构建设定。"
)


def test_onboarding_text_not_treated_as_chapter():
    ctx = _ctx(chapter_text=GREETING)
    assert is_onboarding_assistant_text(GREETING)
    assert effective_chapter_text(ctx) == ""
    story = story_context_for_chapter_create(ctx)
    assert "当前章节正文" not in story
    assert GREETING not in story


def test_chapter_window_marks_written_from_list_not_editor():
    chapters = [
        {"id": "c1", "title": "第一章", "sort_order": 1, "list_index": 1, "content": "x" * 500},
        {"id": "c3", "title": "第三章", "sort_order": 3, "list_index": 3},
    ]
    ctx = _ctx(current_chapter_id="c3", chapter_text="编辑器误开第三章", chapters=chapters)
    window = format_chapter_window(ctx_with_write_anchor(ctx))
    assert "chapter_id=c1" in window
    assert "chapter_id=c3" in window
    assert "← 当前" not in window


def test_run_context_empty_catalog_when_no_chapters():
    ctx = _ctx(chapters=[], novel_id="novel-1")
    bundle = assemble_agent_context(ctx)
    assert bundle["novel"]["chapter_count"] == 0
    assert "chapter_catalog" not in bundle.get("novel", {})
    assert "chapter_focus" not in bundle.get("novel", {})


def test_run_context_includes_chapter_catalog_after_list_tool():
    ctx = _ctx(
        novel_id="novel-1",
        chapters=[{"id": "c1", "title": "第一章", "sort_order": 1, "word_count": 100}],
    )
    bundle = assemble_agent_context(ctx)
    assert bundle["novel"]["chapter_count"] == 1
    assert "chapter_catalog" in bundle["novel"]
    assert "chapter_id=c1" in bundle["novel"]["chapter_catalog"]
    assert "chapter_list_full" not in bundle["novel"]
    assert "capabilities" not in bundle


def test_chapter_has_body_from_word_count_only():
    assert chapter_has_substantial_body({"id": "c1", "title": "第一章", "word_count": 3885})
    assert not chapter_has_substantial_body({"id": "c2", "title": "第二章", "word_count": 0})


def test_chapter_window_from_list_metadata_no_body_text():
    chapters = [
        {"id": "c1", "title": "第一章", "sort_order": 1, "list_index": 1, "word_count": 3000},
        {"id": "c2", "title": "第二章", "sort_order": 2, "list_index": 2, "word_count": 0},
    ]
    ctx = _ctx(chapters=chapters)
    window = format_chapter_window(ctx)
    assert "章节焦点" in window or "省略版" in window
    assert "chapter_id=c1" in window
    assert "待写/占位" in window
    assert "index.json" not in window
    assert "x" * 100 not in window


def test_chapter_catalog_includes_ids_and_write_status():
    chapters = [
        {"id": "uuid-1", "title": "第1章", "sort_order": 1, "list_index": 1, "word_count": 1200},
        {"id": "uuid-2", "title": "第2章", "sort_order": 2, "list_index": 2, "word_count": 0},
    ]
    ctx = _ctx(chapters=chapters)
    catalog = format_chapter_catalog_db(ctx)
    assert "作品库" in catalog
    assert "chapter_id=uuid-1" in catalog
    assert "index=1" in catalog
    assert "已写" in catalog
    assert "待写/空" in catalog
    assembled = assemble_agent_context(ctx)
    assert "chapter_catalog" in (assembled.get("novel") or {})


def test_chapter_focus_only_for_large_books():
    chapters = [
        {
            "id": f"c{i}",
            "title": f"第{i}章",
            "sort_order": i,
            "list_index": i,
            "word_count": 500,
        }
        for i in range(1, 14)
    ]
    ctx = _ctx(chapters=chapters)
    bundle = assemble_agent_context(ctx)
    assert "chapter_catalog" in bundle["novel"]
    assert "chapter_focus" in bundle["novel"]


def test_chapter_window_around_latest_written():
    chapters = [
        {"id": "c1", "title": "第一章", "summary": "开篇", "sort_order": 1, "list_index": 1, "content": "x" * 500},
        {"id": "c2", "title": "第二章", "summary": "冲突", "sort_order": 2, "list_index": 2},
        {"id": "c3", "title": "第三章", "summary": "转折", "sort_order": 3, "list_index": 3},
    ]
    ctx = _ctx(current_chapter_id="c1", chapters=chapters)
    window = format_chapter_window(ctx, radius=5)
    assert "chapter_id=c1" in window
    assert "chapter_id=c2" in window
    assert "全书共 3 章" in window


def test_has_writing_context_ignores_onboarding_assistant():
    ctx = _ctx(
        history=[{"role": "assistant", "content": GREETING}],
        user_message="帮我优化角色库",
    )
    assert has_writing_context(ctx) is False
