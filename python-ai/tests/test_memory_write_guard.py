"""Chapter memory must not land in /memory/novel/; no silent redirect."""

from app.agent.schemas import AgentRunContext
from app.agent.backend.memory_write_guard import validate_memory_write_target


def _ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="run_test",
        session_id="s1",
        message_id="msg",
        user_id=1,
        novel_id="novel-1",
        mode="write",
        user_message="记忆",
        chapters=[
            {
                "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                "title": "第2章 初战",
            },
            {
                "id": "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee",
                "title": "第3章 城外",
            },
        ],
    )


def test_reject_novel_when_title_matches_catalog():
    err = validate_memory_write_target(
        _ctx(),
        "novel",
        "第2章 初战",
        {"v": 1, "title": "第2章 初战", "data": {"body": "## 摘要\n…"}},
    )
    assert err
    assert "禁止写入 /memory/novel/" in err
    assert "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" in err


def test_reject_novel_when_chapter_style_but_unknown_title():
    err = validate_memory_write_target(
        _ctx(),
        "novel",
        "第99章 不存在",
        {"v": 1, "title": "第99章", "data": {"摘要": "…"}},
    )
    assert err
    assert "禁止写入 /memory/novel/" in err


def test_allow_novel_outline_key():
    err = validate_memory_write_target(
        _ctx(),
        "novel",
        "创作规划",
        {"v": 1, "title": "主线", "data": {"body": "## 主线\n…"}},
    )
    assert err is None


def test_reject_chapter_scope_with_title_instead_of_uuid():
    err = validate_memory_write_target(
        _ctx(),
        "chapter",
        "第3章 城外",
        {"v": 1, "title": "第3章 城外", "data": {"摘要": "…"}},
    )
    assert err
    assert "chapter_id" in err
    assert "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee" in err


def test_allow_chapter_scope_with_uuid():
    err = validate_memory_write_target(
        _ctx(),
        "chapter",
        "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee",
        {"v": 1, "title": "第3章 城外", "data": {"摘要": "…"}},
    )
    assert err is None
