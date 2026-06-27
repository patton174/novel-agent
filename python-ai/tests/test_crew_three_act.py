"""Three-act crew integration with mocked subagent stages."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.agent.harness.crew_orchestrator import CrewOrchestrator, template_from_dict
from app.agent.schemas import AgentRunContext


def _ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="run_crew",
        session_id="sess",
        message_id="msg",
        user_id=1,
        novel_id="novel-1",
        user_message="写第一章",
        crew_id="three-act-novel",
        crew_vars={"user_goal": "甜宠开篇"},
    )


def _template():
    path = Path(__file__).resolve().parent / "fixtures" / "crew" / "three-act-novel.json"
    return template_from_dict(json.loads(path.read_text(encoding="utf-8")))


@pytest.mark.asyncio
async def test_three_act_stage_order_and_outputs(monkeypatch):
    monkeypatch.setattr("app.agent.harness.crew_orchestrator.settings.agent_crew_enabled", True)
    order: list[str] = []

    async def _fetch(_cid, _uid):
        return json.loads(
            (
                Path(__file__).resolve().parent / "fixtures" / "crew" / "three-act-novel.json"
            ).read_text(encoding="utf-8")
        )

    async def _run_stage(_ctx, *, stage, prompt):
        order.append(stage.key)
        if stage.key == "plan":
            return {
                "output_schema": "PlanResult",
                "summary": "plan summary",
                "ok": True,
                "status": "PASS",
            }
        if stage.key == "write":
            return {
                "write_chapter_success": True,
                "summary": "wrote ch1",
                "ok": True,
                "status": "PASS",
            }
        return {"summary": "review ok", "ok": True, "status": "PASS"}

    orch = CrewOrchestrator(fetch_template_fn=_fetch, run_stage_fn=_run_stage)
    result, events = await orch.run(_ctx())
    assert result.handled and not result.failed
    assert order == ["plan", "write", "review"]
    assert set(result.stage_outputs.keys()) == {"plan", "write", "review"}
    types = [e.get("type") for e in events]
    assert "crew.started" in types
    assert "crew.completed" in types
    assert types.count("crew.stage.started") == 3


@pytest.mark.asyncio
async def test_review_fail_aborts(monkeypatch):
    monkeypatch.setattr("app.agent.harness.crew_orchestrator.settings.agent_crew_enabled", True)

    async def _fetch(_cid, _uid):
        return json.loads(
            (
                Path(__file__).resolve().parent / "fixtures" / "crew" / "three-act-novel.json"
            ).read_text(encoding="utf-8")
        )

    async def _run_stage(_ctx, *, stage, prompt):
        if stage.key == "plan":
            return {
                "output_schema": "PlanResult",
                "summary": "plan",
                "ok": True,
                "status": "PASS",
            }
        if stage.key == "write":
            return {
                "write_chapter_success": True,
                "summary": "wrote",
                "ok": True,
                "status": "PASS",
            }
        return {"summary": "continuity FAIL", "ok": False, "status": "FAIL"}

    orch = CrewOrchestrator(fetch_template_fn=_fetch, run_stage_fn=_run_stage)
    result, events = await orch.run(_ctx())
    assert result.handled and result.failed
    assert "FAIL" in result.report or "continuity" in result.report
    assert any(e.get("type") == "crew.failed" for e in events)
    assert "review" in result.stage_outputs
