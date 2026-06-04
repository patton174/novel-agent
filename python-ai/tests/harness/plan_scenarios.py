"""Load tests/fixtures/plan/scenarios.json for table-driven plan tests."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.agent_step.schemas import AgentRunContext, PlanRequest, PlanResult, PlanToolCall

_FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "plan" / "scenarios.json"


def load_plan_scenarios() -> list[dict[str, Any]]:
    data = json.loads(_FIXTURES.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return data
    return list(data.get("scenarios") or [])


def _ctx_from_dict(overrides: dict[str, Any]) -> AgentRunContext:
    base: dict[str, Any] = {
        "run_id": "run_harness",
        "session_id": "session_harness",
        "message_id": "message_harness",
        "user_id": 1,
        "mode": "auto",
        "user_message": "测试消息",
    }
    ctx_over = dict(overrides.get("context") or {})
    base.update(ctx_over)
    return AgentRunContext(**base)


def build_plan_request(scenario: dict[str, Any]) -> PlanRequest:
    req_data = scenario.get("request") or {}
    ctx = _ctx_from_dict(req_data)
    return PlanRequest(
        context=ctx,
        think_content=str(req_data.get("think_content") or ""),
        think_tool_input=dict(req_data.get("think_tool_input") or {}),
        transcript=list(req_data.get("transcript") or []),
    )


def build_llm_plan(scenario: dict[str, Any]) -> PlanResult:
    raw = dict(scenario.get("llm_plan") or {})
    tool_calls_raw = raw.pop("tool_calls", None)
    calls: list[PlanToolCall] = []
    if isinstance(tool_calls_raw, list):
        for item in tool_calls_raw:
            if isinstance(item, dict):
                calls.append(
                    PlanToolCall(
                        tool=str(item.get("tool") or ""),
                        input=dict(item.get("input") or {}),
                    )
                )
    return PlanResult(
        routing_source="llm",
        tool_calls=calls,
        **{k: v for k, v in raw.items() if k != "tool_calls"},
    )
