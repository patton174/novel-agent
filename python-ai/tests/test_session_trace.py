import json

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from app.agent.context.compact_micro import MICROCOMPACT_CLEARED_MESSAGE
from app.agent.harness.message_history import (
    _run_context_human,
    build_initial_messages,
    build_run_context_snapshot,
    is_run_context_human,
)
from app.agent.harness.session_trace import (
    extract_tool_chain_for_trace,
    hydrate_session_history_messages,
    messages_from_agent_trace,
)
from app.agent.harness.transcript import AgentTranscript
from app.agent.schemas import AgentRunContext


def test_extract_tool_chain_excludes_final_assistant_text():
    ctx = AgentRunContext(
        run_id="r",
        session_id="s",
        message_id="m",
        user_id=1,
        user_message="写第三章",
    )
    messages = [
        HumanMessage(content="sys"),
        _run_context_human("ctx"),
        HumanMessage(content="写第三章"),
        AIMessage(
            content="",
            tool_calls=[{"id": "t1", "name": "ListChapters", "args": {}}],
        ),
        ToolMessage(content="chapter list body", tool_call_id="t1"),
        AIMessage(content="已列出章节。"),
    ]
    compact = extract_tool_chain_for_trace(messages, ctx)
    assert len(compact) == 2
    restored = messages_from_agent_trace(
        json.dumps({"messages_compact": compact, "trace_version": 2})
    )
    assert len(restored) == 2
    assert isinstance(restored[0], AIMessage)
    assert isinstance(restored[1], ToolMessage)


def test_hydrate_keeps_persisted_tool_bodies_until_in_run_pipeline():
    """Cross-run trace restores bodies; microcompact runs on next LLM turn, not at hydrate."""
    long_body = "x" * 600
    trace = json.dumps(
        {
            "messages_compact": [
                {
                    "type": "ai",
                    "data": {
                        "content": "",
                        "tool_calls": [
                            {"id": "t1", "name": "ReadChapter", "args": {}},
                        ],
                    },
                },
                {
                    "type": "tool",
                    "data": {"content": long_body, "tool_call_id": "t1"},
                },
            ]
        }
    )
    ctx = AgentRunContext(
        run_id="r",
        session_id="s",
        message_id="m",
        user_id=1,
        user_message="继续",
        history=[
            {"role": "user", "content": "写第一章"},
            {
                "role": "assistant",
                "content": "第一章写好了。",
                "agent_trace_json": trace,
            },
        ],
    )
    msgs = hydrate_session_history_messages(ctx)
    tool_msg = msgs[2]
    assert isinstance(tool_msg, ToolMessage)
    assert tool_msg.content == long_body


def test_many_tools_hydrate_full_bodies_not_cleared_at_load():
    compact = []
    for i in range(7):
        compact.extend(
            [
                {
                    "type": "ai",
                    "data": {
                        "content": "",
                        "tool_calls": [{"id": f"t{i}", "name": "ListChapters", "args": {}}],
                    },
                },
                {
                    "type": "tool",
                    "data": {"content": f"body-{i}", "tool_call_id": f"t{i}"},
                },
            ]
        )
    trace = json.dumps({"messages_compact": compact})
    msgs = messages_from_agent_trace(trace)
    tool_bodies = [m.content for m in msgs if isinstance(m, ToolMessage)]
    assert tool_bodies == [f"body-{i}" for i in range(7)]


def test_run_context_snapshot_omits_user_message_in_intent():
    ctx = AgentRunContext(
        run_id="r",
        session_id="s",
        message_id="m",
        user_id=1,
        user_message="hello",
    )
    snap = build_run_context_snapshot(ctx, AgentTranscript())
    assert '"user_message"' not in snap
    msgs = build_initial_messages(ctx, AgentTranscript(), system="sys")
    assert msgs[-1].content == "hello"


def test_messages_from_step_states_fallback():
    trace = json.dumps(
        {
            "stepStates": [
                {
                    "stepId": "s1",
                    "type": "tool",
                    "status": "completed",
                    "toolName": "ListChapters",
                    "displayExcerpt": "共 3 章",
                }
            ]
        }
    )
    msgs = messages_from_agent_trace(trace)
    assert len(msgs) == 2
    assert msgs[0].tool_calls[0]["name"] == "ListChapters"
