"""Tests for standardized agent event stream (Task 1)."""

import json

from app.models.schemas import (
    AgentExecutionRequest,
    AgentInputPayload,
    AgentTraceOptions,
    AgentUserContext,
    normalize_agent_execution_request,
)
from app.runtime.events import build_event, encode_sse
from app.runtime.stream_partition import partition_stream_chunk, partition_stream_chunk_stateful

_EXECUTION_REQUEST = AgentExecutionRequest(
    run_id="run-1",
    session_id="session-1",
    message_id="message-1",
    user=AgentUserContext(id=1, roles=["author"]),
    input=AgentInputPayload(message="续写", mode="continue"),
    context={},
    trace=AgentTraceOptions(),
)


def _parse_sse_agent_events(body: str) -> list[dict]:
    """Parse agent-event blocks from an SSE response body."""
    events: list[dict] = []
    for block in body.split("\n\n"):
        block = block.strip()
        if not block or block.startswith("event: stream-end"):
            continue
        event_name = None
        data_json = None
        for line in block.split("\n"):
            if line.startswith("event: "):
                event_name = line.removeprefix("event: ").strip()
            elif line.startswith("data: "):
                data_json = line.removeprefix("data: ").strip()
        if event_name == "agent-event" and data_json:
            events.append(json.loads(data_json))
    return events


def _assert_strictly_increasing_sequences(events: list[dict]) -> None:
    sequences = [e["sequence"] for e in events]
    assert sequences == sorted(sequences)
    assert len(sequences) == len(set(sequences))
    for prev, curr in zip(sequences, sequences[1:]):
        assert curr == prev + 1


def test_build_event_sets_required_fields():
    event = build_event(
        event_type="message.delta",
        run_id="run-1",
        session_id="session-1",
        message_id="message-1",
        step_id="step-1",
        sequence=3,
        payload={"text": "hello"},
    )

    assert event["type"] == "message.delta"
    assert event["run_id"] == "run-1"
    assert event["sequence"] == 3
    assert event["payload"]["text"] == "hello"
    assert event["persist"] is True
    assert event["event_id"].startswith("evt_")
    assert event["timestamp"]


def test_build_event_unique_event_ids():
    a = build_event(
        event_type="run.started",
        run_id="run-1",
        session_id="session-1",
        message_id="message-1",
        step_id="step-1",
        sequence=1,
        payload={},
    )
    b = build_event(
        event_type="run.started",
        run_id="run-1",
        session_id="session-1",
        message_id="message-1",
        step_id="step-1",
        sequence=2,
        payload={},
    )
    assert a["event_id"] != b["event_id"]


def test_encode_sse_wraps_agent_event():
    raw = encode_sse("agent-event", {"type": "run.started", "run_id": "run-1"})

    assert raw.startswith("event: agent-event\n")
    assert '"type": "run.started"' in raw
    assert raw.endswith("\n\n")
    data_line = raw.split("\n", 2)[1]
    assert data_line.startswith("data: ")
    parsed = json.loads(data_line.removeprefix("data: "))
    assert parsed["run_id"] == "run-1"


def test_encode_sse_preserves_unicode():
    raw = encode_sse("agent-event", {"payload": {"text": "你好"}})
    assert "你好" in raw


def test_normalize_legacy_stream_request():
    normalized = normalize_agent_execution_request(
        {"message": "续写", "context": "前文", "use_tools": True}
    )

    assert normalized.input.message == "续写"
    assert normalized.context == {"text": "前文"}
    assert normalized.run_id.startswith("run_")
    assert normalized.trace.emit_tool is True


def test_normalize_legacy_stream_request_disables_tools():
    normalized = normalize_agent_execution_request(
        {"message": "续写", "use_tools": False}
    )
    assert normalized.trace.emit_tool is False


def test_partition_stream_chunk_skips_thinking_when_disabled():
    think, message = partition_stream_chunk(
        "<think>secret</think>hello",
        emit_think=False,
    )
    assert think is None
    assert message == "hello"

    think, message = partition_stream_chunk(
        "<think>secret",
        emit_think=False,
    )
    assert think is None
    assert message is None


def test_partition_stream_chunk_emits_thinking_when_enabled():
    think, message = partition_stream_chunk(
        "<think>secret</think>",
        emit_think=True,
    )
    assert think == "secret"
    assert message is None


def test_partition_stream_chunk_stateful_handles_split_think_blocks():
    in_think = False
    think, message, in_think = partition_stream_chunk_stateful(
        "<think>internal analysis",
        emit_think=False,
        in_think_block=in_think,
    )
    assert think is None
    assert message is None
    assert in_think is True

    think, message, in_think = partition_stream_chunk_stateful(
        " still hidden",
        emit_think=False,
        in_think_block=in_think,
    )
    assert think is None
    assert message is None
    assert in_think is True

    think, message, in_think = partition_stream_chunk_stateful(
        "</think>可见正文",
        emit_think=False,
        in_think_block=in_think,
    )
    assert think is None
    assert message == "可见正文"
    assert in_think is False


def test_partition_stream_chunk_stateful_preserves_paragraph_newlines():
    think, message, in_think = partition_stream_chunk_stateful(
        "\n\n",
        emit_think=False,
        in_think_block=False,
    )
    assert think is None
    assert message == "\n\n"
    assert in_think is False

