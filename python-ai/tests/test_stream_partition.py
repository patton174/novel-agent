"""Tests for stream chunk partitioning."""

from app.runtime.stream_partition import partition_stream_chunk, partition_stream_chunk_stateful


def test_partition_stream_chunk_stateful_preserves_paragraph_newlines():
    think, message, in_think = partition_stream_chunk_stateful(
        "\n\n",
        emit_think=False,
        in_think_block=False,
    )
    assert think is None
    assert message == "\n\n"
    assert in_think is False


def test_partition_stream_chunk_strips_thinking():
    think, message = partition_stream_chunk(
        "<think>internal</think>可见正文",
        emit_think=True,
    )
    assert think == "internal"
    assert message == "可见正文"
