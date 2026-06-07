"""T3.5 — WorkerSliceSession resume-once semantics."""

from __future__ import annotations

import pytest

from app.agent.harness.run_session import WorkerSliceSession
from app.agent.harness.worker.exceptions import WorkerSliceWaiting


@pytest.mark.asyncio
async def test_worker_slice_resume_then_waiting():
    session = WorkerSliceSession("r1", resume_payload={"choice": "a"})
    got = await session.wait_interaction()
    assert got["choice"] == "a"
    with pytest.raises(WorkerSliceWaiting):
        await session.wait_interaction()


def test_worker_slice_submit_not_supported():
    session = WorkerSliceSession("r1")
    with pytest.raises(NotImplementedError):
        session.submit_interaction({"x": 1})
