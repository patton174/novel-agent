import pytest

from app.agent.harness.tool_display import resolve_delete_chapter_label, resolve_delete_memory_label
from app.agent.schemas import AgentRunContext


@pytest.mark.asyncio
async def test_delete_chapter_label_uses_title_from_ctx():
    cid = "0ec4bbd8-5353-407e-97ce-018613acda18"
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        novel_id="novel-1",
        user_id=1,
        user_message="test",
        chapters=[
            {
                "id": cid,
                "title": "第1章 末法降临",
                "sort_order": 1,
            }
        ],
    )
    label = await resolve_delete_chapter_label(ctx, cid)
    assert "第1章 末法降临" in label
    assert cid not in label


def test_delete_memory_label_prefers_title():
    label = resolve_delete_memory_label(title="力量体系", memory_id="mem-1")
    assert "力量体系" in label
