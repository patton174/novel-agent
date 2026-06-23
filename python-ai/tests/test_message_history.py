"""Message list refresh, pruning, and tool_use/tool_result pairing repair."""

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.agent.harness.message_history import (
    is_tool_pairing_llm_error,
    prune_message_tail,
    refresh_run_context_human,
    repair_tool_message_pairing,
)
from app.agent.harness.transcript import AgentTranscript
from app.agent.schemas import AgentRunContext


def test_refresh_updates_human_block():
    ctx = AgentRunContext(
        run_id="r",
        session_id="s",
        message_id="m",
        user_id=1,
        user_message="hello",
        context_patch={"foo": "bar"},
    )
    transcript = AgentTranscript()
    messages = [
        SystemMessage(content="sys"),
        HumanMessage(content="old"),
        AIMessage(content="", tool_calls=[]),
        ToolMessage(content="ok", tool_call_id="x"),
    ]
    refresh_run_context_human(messages, ctx, transcript)
    assert "hello" in messages[1].content
    assert "RUN_CONTEXT_JSON" in messages[1].content
    assert "old" not in messages[1].content
    assert len(messages) == 4


def test_prune_keeps_head_and_tail():
    messages = [SystemMessage(content="s"), HumanMessage(content="h")]
    for i in range(30):
        messages.append(AIMessage(content=""))
        messages.append(ToolMessage(content="t", tool_call_id=str(i)))
    removed = prune_message_tail(messages, keep_tail_messages=10)
    assert removed > 0
    assert isinstance(messages[0], SystemMessage)
    assert isinstance(messages[1], HumanMessage)
    assert len(messages) <= 12
    assert not isinstance(messages[2], ToolMessage)


def test_repair_inserts_missing_tool_results():
    messages = [
        SystemMessage(content="s"),
        HumanMessage(content="h"),
        AIMessage(
            content="",
            tool_calls=[
                {"name": "Read", "args": {}, "id": "call_a", "type": "tool_call"},
                {"name": "Glob", "args": {}, "id": "call_b", "type": "tool_call"},
            ],
        ),
        ToolMessage(content="ok", tool_call_id="call_a"),
    ]
    fixed, repaired = repair_tool_message_pairing(messages)
    assert repaired is True
    assert len(fixed) == 5
    assert isinstance(fixed[4], ToolMessage)
    assert fixed[4].tool_call_id == "call_b"
    assert "未配对" in str(fixed[4].content)


def test_seal_tool_results_after_partial_batch():
    messages = [
        SystemMessage(content="s"),
        HumanMessage(content="h"),
        AIMessage(
            content="",
            tool_calls=[
                {"name": "ReadMemory", "args": {}, "id": "m1", "type": "tool_call"},
                {"name": "ReadMemory", "args": {}, "id": "m2", "type": "tool_call"},
            ],
        ),
        ToolMessage(content="body", tool_call_id="m1"),
    ]
    from app.agent.harness.message_history import seal_tool_results_for_last_assistant

    assert seal_tool_results_for_last_assistant(messages) is True
    assert messages[4].tool_call_id == "m2"
    assert "未配对" in str(messages[4].content)


def test_repair_does_not_flush_pending_on_human_between_ai_and_tools():
    """HumanMessage between AI and ToolMessages must not synthesize early."""
    messages = [
        SystemMessage(content="s"),
        HumanMessage(content="h"),
        AIMessage(
            content="",
            tool_calls=[
                {"name": "ReadMemory", "args": {}, "id": "m1", "type": "tool_call"},
                {"name": "ReadMemory", "args": {}, "id": "m2", "type": "tool_call"},
            ],
        ),
        HumanMessage(content="compact summary or batch ack"),
        ToolMessage(content="body1", tool_call_id="m1"),
        ToolMessage(content="body2", tool_call_id="m2"),
    ]
    fixed, repaired = repair_tool_message_pairing(messages)
    assert repaired is False
    assert len(fixed) == len(messages)
    assert all("未配对" not in str(m.content) for m in fixed if isinstance(m, ToolMessage))


def test_repair_drops_orphan_tool_messages():
    messages = [
        SystemMessage(content="s"),
        HumanMessage(content="h"),
        AIMessage(content="", tool_calls=[]),
        ToolMessage(content="orphan", tool_call_id="ghost"),
    ]
    fixed, repaired = repair_tool_message_pairing(messages)
    assert repaired is True
    assert len(fixed) == 3


def test_is_tool_pairing_llm_error_detects_minimax_code():
    err = Exception(
        "Error code: 400 - invalid params, tool call and result not match (2013)"
    )
    assert is_tool_pairing_llm_error(err) is True
