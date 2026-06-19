"""Prepare tool_use batch for execution (replaces tool_batch_enrich)."""

from __future__ import annotations

from dataclasses import dataclass, field

from app.agent.harness.orchestration_contract import (
    normalize_tool_calls,
    reorder_execution_items,
    reorder_plan_tool_calls,
)
from app.agent.harness.tool_orchestration import ToolExecutionItem
from app.agent.schemas import PlanToolCall
from app.agent.tools.prepare_tool_input import prepare_tool_input


@dataclass(frozen=True)
class ToolBatchPrepareResult:
    calls: list[PlanToolCall]
    end_run: bool = False
    reason: str = ""
    items: list[ToolExecutionItem] = field(default_factory=list)


def prepare_execution_batch(
    ctx,
    ai_calls: list,
    *,
    think_text: str = "",
) -> ToolBatchPrepareResult:
    _ = think_text
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
        raw = dict(call.input or {})
        prepared, _err = prepare_tool_input(call.tool, raw, ctx)
        inp = prepared.canonical if prepared is not None else raw
        items.append(
            ToolExecutionItem(
                tool_call_id=tid,
                tool=call.tool,
                input=inp,
                call_order=len(items),
            )
        )
    items = reorder_execution_items(items)
    return ToolBatchPrepareResult(calls=ordered, items=items)
