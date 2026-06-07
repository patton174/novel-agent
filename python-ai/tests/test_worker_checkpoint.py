"""Unit tests for worker checkpoint serde and WorkerSliceSession."""

from __future__ import annotations

import pytest

from app.agent.harness.loop_support import RunLoopState
from app.agent.harness.run_session import WorkerSliceSession
from app.agent.harness.transcript import AgentTranscript
from app.agent.harness.worker.checkpoint import restore_worker_state, serialize_worker_state
from app.agent.harness.worker.exceptions import WorkerSliceWaiting
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
    blob = serialize_worker_state(state)
    restored = restore_worker_state(blob, _sample_ctx())
    assert restored.sequence == 3
    assert restored.turn == 1
    assert restored.think_content == "think"
    assert len(restored.transcript.entries) == 1


@pytest.mark.asyncio
async def test_worker_slice_session_resume_then_wait():
    session = WorkerSliceSession("run_test", resume_payload={"type": "choice", "selected_choice": "A"})
    got = await session.wait_interaction()
    assert got["selected_choice"] == "A"
    with pytest.raises(WorkerSliceWaiting):
        await session.wait_interaction()
