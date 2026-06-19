"""T3.4 — checkpoint serializes LangChain messages with tool pairing."""

from __future__ import annotations

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from app.agent.harness.loop_support import RunLoopState
from app.agent.harness.transcript import AgentTranscript
from app.agent.harness.run_checkpoint import restore_run_checkpoint, serialize_run_checkpoint
from app.agent.schemas import AgentRunContext


def _sample_ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="run_test",
        session_id="session_test",
        message_id="message_test",
        user_id=1,
        mode="auto",
        user_message="hello",
    )


def test_messages_roundtrip():
    msgs = [
        HumanMessage(content="hi"),
        AIMessage(
            content="",
            tool_calls=[{"name": "ReadChapter", "args": {}, "id": "t1", "type": "tool_call"}],
        ),
        ToolMessage(content="result", tool_call_id="t1"),
    ]
    state = RunLoopState(
        ctx=_sample_ctx(),
        transcript=AgentTranscript(),
        think_content="",
        sequence=1,
        turn=1,
    )
    blob = serialize_run_checkpoint(state, messages=msgs)
    restored = restore_run_checkpoint(blob, _sample_ctx())
    assert restored.messages is not None
    assert len(restored.messages) == 3
    ai = restored.messages[1]
    assert ai.tool_calls[0]["id"] == "t1"
    assert restored.messages[2].tool_call_id == "t1"
