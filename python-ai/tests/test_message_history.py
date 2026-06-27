"""Tests for CC-style message hydration and RUN_CONTEXT refresh."""

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.agent.harness.message_history import (
    build_initial_messages,
    build_run_context_snapshot,
    hydrate_session_history_messages,
    is_run_context_human,
    refresh_run_context_human,
    repair_tool_message_pairing,
    seal_tool_results_for_last_assistant,
)
from app.agent.harness.transcript import AgentTranscript
from app.agent.schemas import AgentRunContext


def test_hydrate_session_history_skips_duplicate_current_user():
    ctx = AgentRunContext(
        run_id="r",
        session_id="s",
        message_id="m",
        user_id=1,
        user_message="续写第三章",
        history=[
            {"role": "user", "content": "写第一章"},
            {"role": "assistant", "content": "好的。"},
            {"role": "user", "content": "续写第三章"},
        ],
    )
    msgs = hydrate_session_history_messages(ctx)
    assert len(msgs) == 2
    assert isinstance(msgs[0], HumanMessage)
    assert isinstance(msgs[1], AIMessage)
    assert "续写第三章" not in str(msgs[0].content) + str(msgs[1].content)


def test_build_initial_messages_layout():
    ctx = AgentRunContext(
        run_id="r",
        session_id="s",
        message_id="m",
        user_id=1,
        user_message="hello",
        history=[{"role": "user", "content": "prev"}, {"role": "assistant", "content": "ok"}],
    )
    transcript = AgentTranscript()
    msgs = build_initial_messages(ctx, transcript, system="sys")
    assert isinstance(msgs[0], SystemMessage)
    assert is_run_context_human(msgs[1])
    assert "RUN_CONTEXT_JSON" in msgs[1].content
    assert isinstance(msgs[2], HumanMessage)
    assert msgs[2].content == "prev"
    assert isinstance(msgs[3], AIMessage)
    assert msgs[4].content == "hello"
    assert "用户消息" not in msgs[1].content


def test_refresh_updates_only_run_context_snapshot():
    ctx = AgentRunContext(
        run_id="r",
        session_id="s",
        message_id="m",
        user_id=1,
        user_message="hello",
        context_patch={"foo": "bar"},
        history=[{"role": "user", "content": "prev"}],
    )
    transcript = AgentTranscript()
    messages = build_initial_messages(ctx, transcript, system="sys")
    messages.append(AIMessage(content="", tool_calls=[]))
    messages.append(ToolMessage(content="ok", tool_call_id="x"))
    refresh_run_context_human(messages, ctx, transcript)
    assert is_run_context_human(messages[1])
    assert "RUN_CONTEXT_JSON" in messages[1].content
    assert messages[2].content == "prev"
    assert messages[3].content == "hello"


def test_run_context_snapshot_has_no_chapter_catalog():
    ctx = AgentRunContext(
        run_id="r",
        session_id="s",
        message_id="m",
        user_id=1,
        user_message="写",
        chapters=[
            {"id": "c1", "title": "第1章", "sort_order": 1, "list_index": 1, "word_count": 100},
        ],
    )
    snap = build_run_context_snapshot(ctx, AgentTranscript())
    assert "chapter_list_hint" in snap
    assert "chapter_id=c1" not in snap


def test_prune_keeps_head_and_tail():
    from app.agent.harness.message_history import prune_message_tail

    messages = build_initial_messages(
        AgentRunContext(
            run_id="r",
            session_id="s",
            message_id="m",
            user_id=1,
            user_message="u",
        ),
        AgentTranscript(),
        system="s",
    )
    for i in range(30):
        messages.append(AIMessage(content=""))
        messages.append(ToolMessage(content="t", tool_call_id=str(i)))
    removed = prune_message_tail(messages, keep_tail_messages=10)
    assert removed > 0
    assert isinstance(messages[0], SystemMessage)
    assert is_run_context_human(messages[1])
    assert len(messages) <= 14
    assert not isinstance(messages[2], ToolMessage)


def test_seal_and_repair_pairing():
    messages = [
        SystemMessage(content="s"),
        HumanMessage(content="h"),
        AIMessage(
            content="",
            tool_calls=[{"id": "a", "name": "ListChapters", "args": {}}],
        ),
    ]
    changed = seal_tool_results_for_last_assistant(messages)
    assert changed
    repaired, _ = repair_tool_message_pairing(messages)
    assert len(repaired) >= 3
