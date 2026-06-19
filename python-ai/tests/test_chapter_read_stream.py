"""Chapter read NDJSON stream + WriteChapter sanitize tests."""

import json

import pytest

from app.agent.backend.chapter_read_stream import collect_chapter_read_text, iter_ndjson_response
from app.agent.tools.prepare_tool_input import apply_tool_input_policy
from app.agent.streaming.chapter_stream_bridge import should_stream_chapter_write


async def _fake_ndjson(lines: list[dict]):
    body = "\n".join(json.dumps(line, ensure_ascii=False) for line in lines)

    class _Resp:
        async def aiter_text(self):
            yield body

    async for obj in iter_ndjson_response(_Resp()):
        yield obj


@pytest.mark.asyncio
async def test_collect_chapter_read_text_from_deltas():
    text, meta, err = await collect_chapter_read_text(
        _fake_ndjson(
            [
                {"type": "meta", "chapterId": "c1", "title": "开篇"},
                {"type": "delta", "text": "     1\t第一行\n"},
                {"type": "delta", "text": "     2\t第二行\n"},
                {"type": "done"},
            ]
        )
    )
    assert err is None
    assert meta and meta.get("chapterId") == "c1"
    assert "第一行" in text
    assert "第二行" in text


def test_write_chapter_policy_strips_inline_content():
    out = apply_tool_input_policy(
        "WriteChapter",
        {"title": "新章", "content": "模型不应预填的正文" * 10},
    )
    assert out["content"] == ""
    assert out["title"] == "新章"


def test_should_stream_write_chapter_even_with_content():
    assert should_stream_chapter_write(
        "WriteChapter",
        {"title": "新章", "content": "inline body"},
    )
