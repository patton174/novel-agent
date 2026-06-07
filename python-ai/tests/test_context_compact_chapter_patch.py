"""Chapter patch merge + tail selection."""

from app.agent.context.compact import (
    previous_chapter_tail_for_create,
)
from app.agent.schemas import AgentRunContext


def test_tail_uses_latest_written_chapter_not_open_editor_ch1():
    chapters = [
        {"id": "c1", "title": "第一章", "sort_order": 1, "content": "第一章正文" + "x" * 500},
        {"id": "c2", "title": "第二章", "sort_order": 2, "content": "第二章结尾" + "z" * 500},
    ]
    ctx = AgentRunContext(
        run_id="r",
        session_id="s",
        message_id="m",
        user_id=1,
        mode="auto",
        user_message="续写",
        current_chapter_id="c1",
        chapter_text="第一章正文" + "x" * 500,
        chapters=chapters,
    )
    tail = previous_chapter_tail_for_create(ctx)
    assert "第二章结尾" in tail
    assert tail.endswith("z" * 100)
