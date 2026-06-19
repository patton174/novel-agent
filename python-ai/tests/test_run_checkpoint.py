"""Unit tests for run checkpoint serde."""

from __future__ import annotations

from app.agent.harness.loop_support import RunLoopState
from app.agent.harness.run_checkpoint import restore_run_checkpoint, serialize_run_checkpoint
from app.agent.harness.transcript import AgentTranscript
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


def test_checkpoint_roundtrip():
    state = RunLoopState(
        ctx=_sample_ctx(),
        transcript=AgentTranscript(),
        think_content="think",
        sequence=3,
        turn=1,
    )
    state.transcript.append_think("step one")
    blob = serialize_run_checkpoint(state)
    restored = restore_run_checkpoint(blob, _sample_ctx())
    assert restored.sequence == 3
    assert restored.turn == 1
    assert restored.think_content == "think"
    assert len(restored.transcript.entries) == 1
