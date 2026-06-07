"""Chapter Write/Edit progress messages for SSE."""

from app.agent.schemas import AgentRunContext
from app.agent.harness.tool_display import chapter_write_progress_message


def test_chapter_edit_progress_uses_title_from_context():
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        novel_id="novel-1",
        user_id=1,
        user_message="test",
        chapters=[
            {
                "id": "c1",
                "title": "第1章 末法降临",
                "list_index": 1,
                "sort_order": 1,
            }
        ],
    )
    msg = chapter_write_progress_message(
        "EditChapter",
        {"chapter_id": "c1", "title": "第1章 末法降临"},
        ctx,
    )
    assert "正在编辑" in msg
    assert "第1章 末法降临" in msg
    assert "正文" not in msg
