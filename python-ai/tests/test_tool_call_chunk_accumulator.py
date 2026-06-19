"""Tests for incremental tool_call_chunks parsing."""

from langchain_core.messages import AIMessageChunk

from app.agent.harness.tool_call_chunk_accumulator import ToolCallChunkAccumulator


def test_accumulator_waits_for_tool_call_id_before_emit():
    acc = ToolCallChunkAccumulator()
    c1 = AIMessageChunk(
        content="",
        tool_call_chunks=[
            {"name": "CreateMemory", "args": '{"node_type":"root","title":"世界观"}', "id": None, "index": 0},
        ],
    )
    assert acc.feed(c1) == []
    c2 = AIMessageChunk(
        content="",
        tool_call_chunks=[
            {"name": None, "args": "", "id": "call_world", "index": 0},
        ],
    )
    ready = acc.feed(c2)
    assert len(ready) == 1
    assert ready[0].tool_call_id == "call_world"
    assert ready[0].input == {"title": "世界观"}


def test_accumulator_emits_when_args_json_complete():
    acc = ToolCallChunkAccumulator()
    c1 = AIMessageChunk(
        content="",
        tool_call_chunks=[
            {"name": "ReadChapter", "args": "", "id": "c1", "index": 0},
        ],
    )
    assert acc.feed(c1) == []
    c2 = AIMessageChunk(
        content="",
        tool_call_chunks=[
            {"name": None, "args": '{"chapter_id":"abc"}', "id": None, "index": 0},
        ],
    )
    ready = acc.feed(c2)
    assert len(ready) == 1
    assert ready[0].tool == "ReadChapter"
    assert ready[0].tool_call_id == "c1"
    assert ready[0].input == {"chapter_id": "abc"}


def test_accumulator_dedupes_by_tool_call_id():
    acc = ToolCallChunkAccumulator()
    chunk = AIMessageChunk(
        content="",
        tool_call_chunks=[
            {"name": "ListChapters", "args": "{}", "id": "x1", "index": 0},
        ],
    )
    assert len(acc.feed(chunk)) == 1
    assert acc.feed(chunk) == []
