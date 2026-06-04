"""CC orchestration contract tests."""

from app.agent_step.orchestration_contract import (
    build_main_loop_system_prompt,
    get_tool_names,
    reorder_plan_tool_calls,
    validate_plan_batch,
)
from app.agent_step.schemas import PlanToolCall


def test_cc_tools_registered():
    names = get_tool_names()
    assert "Read" in names
    assert "chapter_create" not in names


def test_reorder_puts_askuser_last():
    calls = [
        PlanToolCall(tool="AskUser", input={"questions": []}),
        PlanToolCall(tool="Glob", input={"pattern": "*"}),
    ]
    ordered = reorder_plan_tool_calls(calls)
    assert [c.tool for c in ordered] == ["Glob", "AskUser"]


def test_validate_unknown_tool():
    calls = [PlanToolCall(tool="chapter_list", input={})]
    codes = {v.code for v in validate_plan_batch(calls)}
    assert "unknown_tool" in codes


def test_main_loop_prompt_prefers_database_catalog():
    text = build_main_loop_system_prompt()
    assert "chapter_catalog" in text
    assert "PostgreSQL" in text or "作品库" in text
    assert "Read" in text
