"""Prepare tool_use batch for execution (replaces tool_batch_enrich)."""

from __future__ import annotations

from dataclasses import dataclass, field

from app.agent.harness.orchestration_contract import normalize_tool_calls, reorder_plan_tool_calls
from app.agent.schemas import AgentRunContext, PlanToolCall
from app.agent.harness.tool_orchestration import ToolExecutionItem


@dataclass(frozen=True)
class ToolBatchPrepareResult:
    calls: list[PlanToolCall]
    end_run: bool = False
    reason: str = ""
    items: list[ToolExecutionItem] = field(default_factory=list)


def prepare_execution_batch(
    ctx: AgentRunContext,
    ai_calls: list,
    *,
    think_text: str = "",
) -> ToolBatchPrepareResult:
    _ = ctx, think_text
    ordered = reorder_plan_tool_calls(
        normalize_tool_calls([c.call for c in ai_calls])
    )
    used: set[str] = set()
    items: list[ToolExecutionItem] = []
    for call in ordered:
        tid = ""
        for c in ai_calls:
            if c.tool_call_id in used:
                continue
            if c.call.tool == call.tool and c.call.input == call.input:
                tid = c.tool_call_id
                used.add(tid)
                break
        if not tid:
            for c in ai_calls:
                if c.tool_call_id not in used and c.call.tool == call.tool:
                    tid = c.tool_call_id
                    used.add(tid)
                    break
        if not tid:
            tid = f"call_{len(items)}"
        items.append(
            ToolExecutionItem(
                tool_call_id=tid,
                tool=call.tool,
                input=dict(call.input or {}),
            )
        )
    return ToolBatchPrepareResult(calls=ordered, items=items)
