"""T3.2 — sse_bridge split modules export expected APIs."""

from __future__ import annotations

import inspect

from app.agent.streaming import (
    chapter_stream_bridge,
    context_enrich_bridge,
    sse_bridge,
    tool_side_effect,
)


def test_sse_bridge_public_api():
    assert inspect.isasyncgenfunction(sse_bridge.stream_cc_tool_step)
    assert callable(sse_bridge.tool_result_to_step_payload)


def test_chapter_stream_bridge_exports():
    assert callable(chapter_stream_bridge.should_stream_chapter_write)
    assert inspect.isasyncgenfunction(chapter_stream_bridge.yield_chapter_stream_deltas)
    assert inspect.isasyncgenfunction(chapter_stream_bridge.run_chapter_stream_pipeline)


def test_context_enrich_bridge_exports():
    assert inspect.iscoroutinefunction(context_enrich_bridge.enrich_context_for_tool_step)


def test_tool_side_effect_exports():
    assert callable(tool_side_effect.failure_event_sequence)
    assert inspect.iscoroutinefunction(tool_side_effect.finalize_streamed_chapter_write)
