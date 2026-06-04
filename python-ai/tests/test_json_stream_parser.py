"""DisplayContentStreamParser fence stripping."""

from app.agent_step.json_stream import DisplayContentStreamParser


def test_parser_streams_content_inside_markdown_json_fence():
    parser = DisplayContentStreamParser()
    chunks = [
        "```json\n",
        '{"display":{"content":"## 标题\\n',
        '第一段"}}',
    ]
    out = ""
    for chunk in chunks:
        out += parser.feed(chunk)
    assert "## 标题" in out
    assert "第一段" in out


def test_parser_incremental_without_fence():
    parser = DisplayContentStreamParser()
    assert parser.feed('{"display":{"content":"hello') == "hello"
    assert parser.feed(' world"}}') == " world"
