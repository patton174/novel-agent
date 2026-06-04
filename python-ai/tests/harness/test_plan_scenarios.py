"""Table-driven CC tool batch scenarios."""

import pytest

from app.agent_step.orchestration_contract import (
    normalize_tool_calls,
    reorder_plan_tool_calls,
    validate_plan_batch,
)
from tests.harness.plan_scenarios import load_plan_scenarios


@pytest.mark.parametrize("scenario", load_plan_scenarios(), ids=lambda s: s["id"])
def test_plan_scenario(scenario: dict) -> None:
    from app.agent_step.schemas import PlanToolCall

    expect = scenario.get("expect") or {}
    raw_calls = scenario.get("tool_calls") or []
    calls = normalize_tool_calls(
        [PlanToolCall(tool=c["tool"], input=c.get("input") or {}) for c in raw_calls]
    )
    violations = validate_plan_batch(calls)
    codes = {v.code for v in violations}

    if expect.get("valid") is False:
        for code in expect.get("codes") or ["unknown_tool"]:
            assert code in codes
        return

    assert not codes or expect.get("valid", True)

    if expect.get("order_last"):
        ordered = reorder_plan_tool_calls(calls)
        assert ordered[-1].tool == expect["order_last"]
