"""Tests for per-turn tool batch reconcile (partial repair)."""

from __future__ import annotations

from dataclasses import dataclass

from app.agent.harness.turn_tool_batch import TurnToolBatchState
from app.agent.schemas import AgentRunContext, PlanToolCall


@dataclass(frozen=True)
class _Call:
    tool_call_id: str
    call: PlanToolCall


def _ctx(**kwargs) -> AgentRunContext:
    base = {
        "run_id": "run1",
        "session_id": "sess1",
        "message_id": "msg1",
        "user_id": 1,
        "user_message": "hi",
        "novel_id": "novel1",
        "chapters": [],
    }
    base.update(kwargs)
    return AgentRunContext(**base)


def test_reconcile_marks_invalid_readchapter_without_target():
    batch = TurnToolBatchState()
    item = _Call("tid1", PlanToolCall(tool="ReadChapter", input={}))
    valid, invalid = batch.reconcile([item], _ctx())
    assert valid == []
    assert len(invalid) == 1
    assert invalid[0].tool_call_id == "tid1"
    assert "chapter" in invalid[0].error.lower() or "provide" in invalid[0].error.lower()


def test_reconcile_keeps_stream_ready_canonical():
    batch = TurnToolBatchState()
    batch.record_ready("tid1", "ReadChapter", {"chapter_id": "ch-1"})
    item = _Call("tid1", PlanToolCall(tool="ReadChapter", input={}))
    valid, invalid = batch.reconcile([item], _ctx())
    assert invalid == []
    assert len(valid) == 1
    assert valid[0].call.input.get("chapter_id") == "ch-1"


def test_reconcile_mixed_valid_and_invalid():
    batch = TurnToolBatchState()
    batch.record_invalid("bad", "ReadChapter", {}, "need chapter target")
    good = _Call("good", PlanToolCall(tool="ListChapters", input={}))
    bad = _Call("bad", PlanToolCall(tool="ReadChapter", input={}))
    valid, invalid = batch.reconcile([good, bad], _ctx())
    assert len(valid) == 1
    assert valid[0].tool_call_id == "good"
    assert len(invalid) == 1
    assert invalid[0].tool_call_id == "bad"
