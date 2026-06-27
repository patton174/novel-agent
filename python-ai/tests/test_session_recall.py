from app.agent.context.prompting.run_context import assemble_agent_context
from app.agent.schemas import AgentRunContext


def _ctx(**kwargs) -> AgentRunContext:
    base = {
        "run_id": "r1",
        "session_id": "s1",
        "message_id": "m1",
        "user_id": 1,
        "user_message": "续写第三章",
        "novel_id": "n1",
    }
    base.update(kwargs)
    return AgentRunContext(**base)


def test_assemble_agent_context_no_chapter_catalog_or_recall():
    ctx = _ctx(
        chapters=[
            {"id": "c1", "title": "第1章", "sort_order": 1, "list_index": 1, "word_count": 1200},
        ],
        history=[
            {"role": "user", "content": "设定主角"},
            {"role": "assistant", "content": "主角设定已写入记忆。"},
        ],
    )
    payload = assemble_agent_context(ctx)
    novel = payload.get("novel") or {}
    assert "chapter_catalog" not in novel
    assert "chapter_focus" not in novel
    assert novel.get("chapter_list_hint")
    assert "recall" not in (payload.get("session") or {})
    assert "dialogue" not in payload
