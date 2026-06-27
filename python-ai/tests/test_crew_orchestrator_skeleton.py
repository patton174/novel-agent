"""CrewOrchestrator skeleton — skipped when disabled."""

from __future__ import annotations

import pytest

from app.agent.harness.crew_orchestrator import CrewOrchestrator
from app.agent.schemas import AgentRunContext


def _ctx(**kwargs) -> AgentRunContext:
    base = dict(
        run_id="run1",
        session_id="sess",
        message_id="msg",
        user_id=1,
        novel_id="novel-1",
        user_message="写第一章",
    )
    base.update(kwargs)
    return AgentRunContext(**base)


@pytest.mark.asyncio
async def test_crew_skipped_when_disabled(monkeypatch):
    monkeypatch.setattr("app.agent.harness.crew_orchestrator.settings.agent_crew_enabled", False)
    orch = CrewOrchestrator()
    result, events = await orch.run(_ctx(crew_id="three-act-novel"))
    assert not result.handled
    assert not result.failed
    assert events == []


@pytest.mark.asyncio
async def test_crew_skipped_without_crew_id(monkeypatch):
    monkeypatch.setattr("app.agent.harness.crew_orchestrator.settings.agent_crew_enabled", True)
    orch = CrewOrchestrator()
    result, events = await orch.run(_ctx())
    assert not result.handled
    assert events == []
