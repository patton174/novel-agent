"""CC orchestration contract tests."""

from app.agent.harness.orchestration_contract import (
    build_main_loop_system_prompt,
    get_tool_names,
    reorder_plan_tool_calls,
    validate_plan_batch,
)
from app.agent.schemas import PlanToolCall


def test_cc_tools_registered():
    names = get_tool_names()
    assert "ReadChapter" in names
    assert "ListChapters" in names
    assert "Read" not in names
    assert "chapter_create" not in names


def test_reorder_puts_askuser_last():
    calls = [
        PlanToolCall(tool="AskUser", input={"questions": []}),
        PlanToolCall(tool="ListChapters", input={}),
    ]
    ordered = reorder_plan_tool_calls(calls)
    assert [c.tool for c in ordered] == ["ListChapters", "AskUser"]


def test_validate_unknown_tool():
    calls = [PlanToolCall(tool="chapter_list", input={})]
    codes = {v.code for v in validate_plan_batch(calls)}
    assert "unknown_tool" in codes


def test_main_loop_prompt_prefers_database_catalog():
    text = build_main_loop_system_prompt()
    assert "chapter_catalog" in text
    assert "PostgreSQL" in text or "作品库" in text
    assert "ListChapters" in text
    assert "ReadChapter" in text
