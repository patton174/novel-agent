"""extractor 分块抽取（mock LLM）。"""

from __future__ import annotations

from unittest.mock import patch

import pytest

from app.kg.extractor import _split_chunks, extract_entities_relations


def test_split_chunks_short_text_single():
    assert _split_chunks("短文本", 8000, 1000) == ["短文本"]


def test_split_chunks_long_text_overlap():
    text = "字" * 18000
    chunks = _split_chunks(text, 8000, 1000)
    assert len(chunks) >= 2
    assert chunks[1][:1000] == chunks[0][-1000:]


@pytest.mark.asyncio
async def test_extract_merges_multiple_blocks():
    responses = iter(
        [
            '{"entities":[{"name":"林动","type":"character"}],"relations":[]}',
            '{"entities":[{"name":"应欢欢","type":"character"}],"relations":[{"src":"林动","rel":"师承","dst":"应欢欢"}]}',
        ]
    )

    async def fake_generate(*a, **k):
        return next(responses)

    with patch("app.kg.extractor.generate_text", side_effect=fake_generate):
        result = await extract_entities_relations("字" * 13000)
    assert len(result["entities"]) == 2
    assert len(result["relations"]) == 1
