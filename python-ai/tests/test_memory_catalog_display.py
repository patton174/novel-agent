"""Chapter memory catalog shows titles, not raw UUID-only lines."""

from app.agent.backend.memory_catalog import chapter_memory_catalog_label
from app.agent.schemas import AgentRunContext


def _ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        novel_id="novel-1",
        mode="write",
        user_message="x",
        chapters=[
            {
                "id": "11639021-d1c3-43e0-8581-08755eeb74dd",
                "title": "第10章《新的开始》",
                "list_index": 10,
            },
        ],
    )


def test_chapter_memory_catalog_label_uses_catalog_title():
    label = chapter_memory_catalog_label(
        _ctx(),
        "11639021-d1c3-43e0-8581-08755eeb74dd",
        {"v": 1, "title": "旧标题"},
    )
    assert "第10章《新的开始》" in label
    assert "列表第10章" in label
    assert "chapter_id=11639021" in label


def test_chapter_memory_catalog_label_falls_back_to_envelope_title():
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        novel_id="novel-1",
        mode="write",
        user_message="x",
        chapters=[],
    )
    label = chapter_memory_catalog_label(
        ctx,
        "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        {"v": 1, "title": "第3章 城外"},
    )
    assert "第3章 城外" in label
