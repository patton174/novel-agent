"""Per-turn tool_use batch state — incremental exec + held invalid + partial repair."""

from __future__ import annotations

import dataclasses
from dataclasses import dataclass, field
from typing import Any

from app.agent.schemas import PlanToolCall
from app.agent.tools.prepare_tool_input import prepare_tool_input


@dataclass(frozen=True)
class InvalidToolEntry:
    tool_call_id: str
    tool: str
    input: dict[str, Any]
    error: str


@dataclass
class TurnToolBatchState:
    """Tracks early ready/invalid during LLM stream; reconciled at turn end."""

    invalid: dict[str, InvalidToolEntry] = field(default_factory=dict)
    ready_canonical: dict[str, dict[str, Any]] = field(default_factory=dict)

    def record_invalid(
        self,
        tool_call_id: str,
        tool: str,
        inp: dict[str, Any],
        error: str,
    ) -> None:
        tid = (tool_call_id or "").strip()
        if not tid:
            return
        self.ready_canonical.pop(tid, None)
        self.invalid[tid] = InvalidToolEntry(
            tool_call_id=tid,
            tool=(tool or "").strip(),
            input=dict(inp or {}),
            error=(error or "invalid input").strip(),
        )

    def record_ready(
        self,
        tool_call_id: str,
        tool: str,
        canonical: dict[str, Any],
    ) -> None:
        tid = (tool_call_id or "").strip()
        if not tid:
            return
        self.invalid.pop(tid, None)
        self.ready_canonical[tid] = dict(canonical or {})

    @property
    def invalid_entries(self) -> list[InvalidToolEntry]:
        return list(self.invalid.values())

    def reconcile(
        self,
        ai_calls: list[Any],
        ctx: Any,
    ) -> tuple[list[Any], list[InvalidToolEntry]]:
        """Validate each tool_call; merge stream-held invalid. Returns (valid_calls, invalid)."""
        valid: list[Any] = []
        for item in ai_calls:
            tid = str(getattr(item, "tool_call_id", "") or "").strip()
            call = getattr(item, "call", None)
            if not tid or call is None:
                continue
            if tid in self.invalid:
                continue
            tool = str(getattr(call, "tool", "") or "").strip()
            raw = dict(getattr(call, "input", None) or {})
            if tid in self.ready_canonical:
                canonical = self.ready_canonical[tid]
                if hasattr(call, "model_copy"):
                    call = call.model_copy(update={"input": canonical})
                else:
                    call.input = canonical
                if dataclasses.is_dataclass(item):
                    valid.append(dataclasses.replace(item, call=call))
                else:
                    valid.append(item)
                continue
            prepared, err = prepare_tool_input(tool, raw, ctx)
            if err or prepared is None:
                self.record_invalid(tid, tool, raw, err or "invalid input")
                continue
            self.record_ready(tid, tool, prepared.canonical)
            if hasattr(call, "model_copy"):
                call = call.model_copy(update={"input": prepared.canonical})
            else:
                call.input = prepared.canonical
            if dataclasses.is_dataclass(item):
                valid.append(dataclasses.replace(item, call=call))
            else:
                valid.append(item)
        return valid, self.invalid_entries
