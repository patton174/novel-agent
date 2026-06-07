"""Reorder (tool_call_id, PlanToolCall) pairs with terminal-last policy."""

from __future__ import annotations

import json
from collections import defaultdict

from app.agent.harness.orchestration_contract import reorder_plan_tool_calls
from app.agent.schemas import PlanToolCall


def _call_signature(tool: str, inp: dict) -> str:
    return f"{(tool or '').strip()}\0{json.dumps(inp or {}, sort_keys=True, ensure_ascii=False)}"


def reorder_tool_call_id_pairs(
    pairs: list[tuple[str, PlanToolCall]],
) -> list[tuple[str, PlanToolCall]]:
    """Apply reorder_plan_tool_calls while keeping tool_call_id attached."""
    if not pairs:
        return []
    by_sig: dict[str, list[tuple[str, PlanToolCall]]] = defaultdict(list)
    for tid, call in pairs:
        by_sig[_call_signature(call.tool or "", dict(call.input or {}))].append(
            (tid, call)
        )
    ordered_calls = reorder_plan_tool_calls([p[1] for p in pairs])
    out: list[tuple[str, PlanToolCall]] = []
    for call in ordered_calls:
        sig = _call_signature(call.tool or "", dict(call.input or {}))
        queue = by_sig.get(sig) or []
        if queue:
            out.append(queue.pop(0))
        else:
            out.append((pairs[0][0], call))
    return out
