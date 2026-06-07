"""KG extractor — LLM JSON parsing."""

from __future__ import annotations

import asyncio

from app.kg import extractor


def test_extract_parses_llm_json(monkeypatch):
    async def fake_llm(prompt, **kw):
        return (
            '{"entities":[{"name":"林动","type":"character"}],'
            '"relations":[{"src":"林动","rel":"师承","dst":"师傅"}]}'
        )

    monkeypatch.setattr(extractor, "generate_text", fake_llm)
    out = asyncio.run(extractor.extract_entities_relations("林动拜师……"))
    assert out["entities"][0]["name"] == "林动"
    assert out["relations"][0]["rel"] == "师承"


def test_extract_handles_malformed_json(monkeypatch):
    async def fake_llm(prompt, **kw):
        return "not json"

    monkeypatch.setattr(extractor, "generate_text", fake_llm)
    out = asyncio.run(extractor.extract_entities_relations("x"))
    assert out == {"entities": [], "relations": []}
