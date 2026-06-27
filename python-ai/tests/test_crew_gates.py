"""Crew gate evaluation unit tests."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.agent.harness.crew_models import CrewContext, CrewStageDef
from app.agent.harness.crew_orchestrator import evaluate_gate, render_prompt, template_from_dict


_FIXTURE = Path(__file__).resolve().parent / "fixtures" / "crew" / "three_act.json"


def _load_template():
    return template_from_dict(json.loads(_FIXTURE.read_text(encoding="utf-8")))


def test_gate_always():
    tpl = _load_template()
    ctx = CrewContext(template=tpl)
    assert evaluate_gate(tpl.stages[0], ctx, None) is True


def test_gate_on_plan_success_requires_valid_plan():
    tpl = _load_template()
    ctx = CrewContext(template=tpl, stage_outputs={"plan": {"status": "FAIL"}})
    write = tpl.stages[1]
    assert evaluate_gate(write, ctx, tpl.stages[0]) is False

    ctx.stage_outputs["plan"] = {
        "output_schema": "PlanResult",
        "summary": "第一章大纲",
        "ok": True,
    }
    assert evaluate_gate(write, ctx, tpl.stages[0]) is True


def test_gate_on_write_success():
    tpl = _load_template()
    ctx = CrewContext(
        template=tpl,
        stage_outputs={
            "plan": {"output_schema": "PlanResult", "summary": "ok", "ok": True},
            "write": {"status": "FAIL"},
        },
    )
    review = tpl.stages[2]
    assert evaluate_gate(review, ctx, tpl.stages[1]) is False

    ctx.stage_outputs["write"] = {
        "ok": True,
        "write_chapter_success": True,
        "summary": "chapter written",
    }
    assert evaluate_gate(review, ctx, tpl.stages[1]) is True


def test_render_prompt_substitutes_stage_outputs():
    ctx = CrewContext(
        stage_outputs={"plan": {"summary": "开篇钩子+人物出场"}},
    )
    text = render_prompt(
        "执行写作：{{plan.summary}}",
        crew_ctx=ctx,
        crew_vars={"user_goal": "甜宠"},
    )
    assert "开篇钩子+人物出场" in text
