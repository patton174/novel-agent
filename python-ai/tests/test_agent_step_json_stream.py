"""Tests for incremental display.content JSON extraction."""

from app.agent.streaming.json_stream import DisplayContentStreamParser


def test_extracts_content_incrementally():
    parser = DisplayContentStreamParser()
    prefix = (
        '{"step_kind":"output","action":"continue","next_tool":"end",'
        '"next_input":{},"context_patch":{},"display":{"type":"message","content":"'
    )
    assert parser.feed(prefix) == ""
    assert parser.feed("霓虹") == "霓虹"
    assert parser.feed("灯下") == "灯下"
    assert parser.feed('","stream":true},"reason":"ok"}') == ""
