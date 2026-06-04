"""Tests for agent LLM trace logging."""

import json
from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage

from app.agent_step.llm_trace import log_llm_exchange, trace_enabled


def test_log_llm_exchange_writes_utf8(tmp_path, monkeypatch):
    trace_file = tmp_path / "trace.log"
    monkeypatch.setattr("app.agent_step.llm_trace.settings.agent_llm_trace", True)
    monkeypatch.setattr("app.agent_step.llm_trace.settings.agent_llm_trace_file", str(trace_file))
    monkeypatch.setattr("app.agent_step.llm_trace._FILE_LOGGER", None)

    log_llm_exchange(
        phase="plan",
        run_id="run_test",
        step_index=2,
        attempt=1,
        messages=[
            SystemMessage(content="编排器"),
            HumanMessage(content='CONTEXT_JSON:\n{"intent":{"user_message":"优化世界观"}}'),
        ],
        raw_response='{"action":"continue","next_tool":"ask_user","reason":"待确认"}',
        parsed_summary="next_tool=ask_user",
        extra={"think_has_pending_confirm": True},
    )

    text = trace_file.read_text(encoding="utf-8")
    assert "优化世界观" in text
    assert "待确认" in text
    assert trace_enabled() is True
