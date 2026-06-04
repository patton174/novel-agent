import pytest

from app.agent_step.schemas import AgentRunContext
from app.agent_step.tool_display import resolve_delete_target_label


@pytest.mark.asyncio
async def test_delete_label_uses_chapter_title_from_ctx():
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
    path = f"/novel/novel-1/chapters/{cid}.md"
    label = await resolve_delete_target_label(ctx, path)
    assert "第1章 末法降临" in label
    assert ".md" not in label
    assert cid not in label


@pytest.mark.asyncio
async def test_delete_label_memory_scope_and_key():
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        novel_id="novel-1",
        user_id=1,
        user_message="test",
    )
    path = "/novel/novel-1/memory/world/力量体系.json"
    label = await resolve_delete_target_label(ctx, path)
    assert "世界观" in label
    assert "力量体系" in label
