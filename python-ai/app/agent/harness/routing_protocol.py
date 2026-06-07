"""Step routing: tools emit StepResult metadata; orchestration is query_loop tool_use."""

from __future__ import annotations

from app.agent.schemas import StepResult


def strip_step_routing(result: StepResult) -> StepResult:
    """Tool steps must not specify next_tool except when ending the run."""
    if result.action == "end":
        return result.model_copy(update={"next_tool": "end", "next_input": {}})
    if result.action == "wait":
        return result.model_copy(
            update={
                "wait_for": "interaction",
                "next_tool": "",
                "next_input": {},
            }
        )
    return result.model_copy(
        update={
            "action": "continue",
            "next_tool": "",
            "next_input": {},
        }
    )
