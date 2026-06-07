from app.agent.harness.routing import (
    format_dialogue_history,
    has_writing_context,
    is_continue_request,
    needs_user_direction,
    project_summary_from_ctx,
    story_context_from_ctx,
)
from app.agent.schemas import AgentRunContext


def _ctx(**overrides) -> AgentRunContext:
    base = {
        "run_id": "r1",
        "session_id": "s1",
        "message_id": "m1",
        "user_id": 1,
        "mode": "continue",
        "user_message": "继续",
    }
    base.update(overrides)
    return AgentRunContext(**base)


def test_project_summary_includes_genre_and_style():
    ctx = _ctx(
        project={
            "title": "星辰之途",
            "description": "少年踏上修仙路",
            "genre": "玄幻",
            "style": "爽文",
            "target_chapter_words": 3000,
        }
    )
    summary = project_summary_from_ctx(ctx)
    assert "星辰之途" in summary
    assert "修仙" in summary
    assert "玄幻" in summary
    assert "爽文" in summary


def test_story_context_from_project_without_chapter():
    ctx = _ctx(
        project={"title": "测试", "description": "主角是林霄"},
    )
    story = story_context_from_ctx(ctx)
    assert "林霄" in story
    assert "测试" in story


def test_continue_with_assistant_history_not_needs_direction():
    ctx = _ctx(
        history=[{"role": "assistant", "content": "夜色深沉，林霄睁开眼。"}],
    )
    assert has_writing_context(ctx)
    assert is_continue_request(ctx)
    assert needs_user_direction(ctx) is False


def test_continue_without_context_still_needs_direction():
    ctx = _ctx(user_message="继续", history=[])
    assert not has_writing_context(ctx)
    assert not is_continue_request(ctx)
    assert needs_user_direction(ctx) is True


def test_format_dialogue_history_includes_user_turns_and_interactions():
    ctx = _ctx(
        user_message="世界观有些不符",
        history=[
            {"role": "user", "content": "帮我改世界观"},
            {"role": "assistant", "content": "请确认主角定位"},
        ],
        context_patch={
            "user_interactions": [
                {"type": "user_input", "text": "我的回答：主角独行者，单女主霜倾颜"},
            ]
        },
        selected_choice={"id": "custom", "title": "我的回答：虚界降临1年", "description": ""},
    )
    transcript = [{"kind": "interaction", "summary": "主角独行者"}]
    dialogue = format_dialogue_history(ctx, transcript=transcript)
    assert "主角独行者" in dialogue
    assert "虚界降临1年" in dialogue
    assert "帮我改世界观" in dialogue


def test_format_dialogue_history_skips_stale_interactions_without_transcript():
    ctx = _ctx(
        user_message="继续",
        history=[{"role": "user", "content": "我的回答：虚界降临1年"}],
        context_patch={
            "user_interactions": [
                {"type": "user_input", "text": "我的回答：主角独行者"},
            ]
        },
        selected_choice={"id": "custom", "title": "虚界降临1年", "description": ""},
    )
    dialogue = format_dialogue_history(ctx)
    assert "主角独行者" not in dialogue
    assert "虚界降临1年" not in dialogue
    assert "帮我改世界观" not in dialogue
