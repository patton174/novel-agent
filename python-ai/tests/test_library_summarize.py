"""/internal/library/summarize 单测。"""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient


def test_summarize_returns_summary(monkeypatch):
    from app.main import app
    from app.config import settings

    monkeypatch.setattr(settings, "internal_service_key", "dev-internal-key-change-me")

    async def fake_generate(prompt, system_message=None, **kw):
        return "本书讲述林动修仙之路。"

    with patch("app.api.library_routes.generate_text", new=fake_generate):
        client = TestClient(app)
        resp = client.post(
            "/internal/library/summarize",
            headers={"X-Internal-Service-Key": "dev-internal-key-change-me"},
            json={
                "catalogNovelId": "c1",
                "chapterTitles": ["第一章", "第二章"],
                "firstChunks": ["段落一", "段落二"],
            },
        )
    assert resp.status_code == 200
    assert "林动" in resp.json()["summary"]


def test_summarize_rejects_bad_key(monkeypatch):
    from app.main import app
    from app.config import settings

    monkeypatch.setattr(settings, "internal_service_key", "dev-internal-key-change-me")

    client = TestClient(app)
    resp = client.post(
        "/internal/library/summarize",
        headers={"X-Internal-Service-Key": "wrong"},
        json={"catalogNovelId": "c1", "chapterTitles": [], "firstChunks": []},
    )
    assert resp.status_code == 403
