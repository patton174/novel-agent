"""Semantic duplicate tests."""

import pytest


@pytest.mark.asyncio
async def test_find_semantic_duplicates_detects_similar(monkeypatch):
    import app.agent.tools.semantic_duplicate as sd

    async def fake_embed(texts):
        out = []
        for t in texts:
            if str(t).startswith("SAME"):
                out.append([1.0, 0.0, 0.0])
            else:
                out.append([0.0, 1.0, 0.0])
        return out

    monkeypatch.setattr(sd, "embed_texts", fake_embed)
    body_a = "SAME " + ("plot beat alpha duplicate content segment. " * 8)
    body_b = "SAME " + ("plot beat beta duplicate content segment. " * 8)
    hits = await sd.find_semantic_duplicates(
        [
            ("id-a", "A", body_a),
            ("id-b", "B", body_b),
        ],
        threshold=0.88,
    )
    assert len(hits) >= 1
    assert set(hits[0]["chapter_ids"]) == {"id-a", "id-b"}
