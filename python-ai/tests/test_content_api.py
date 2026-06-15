"""Tests for Content API URL helpers."""

from app.agent.backend import content_api


def test_content_auth_url(monkeypatch):
    monkeypatch.setattr(content_api.settings, "content_base_url", "http://novel-studio:8080")
    assert (
        content_api.content_auth_url("/chapters/x/read")
        == "http://novel-studio:8080/api/content/auth/chapters/x/read"
    )
    assert (
        content_api.content_auth_url("novels/n1/chapters")
        == "http://novel-studio:8080/api/content/auth/novels/n1/chapters"
    )


def test_content_internal_url(monkeypatch):
    monkeypatch.setattr(content_api.settings, "content_base_url", "http://novel-studio:8080")
    assert (
        content_api.content_internal_url("/agent/runs/run-1/checkpoint")
        == "http://novel-studio:8080/internal/agent/runs/run-1/checkpoint"
    )


def test_user_headers_includes_internal_key(monkeypatch):
    monkeypatch.setattr(content_api.settings, "internal_service_key", "test-key")
    headers = content_api.user_headers(42, edit_source="ai")
    assert headers[content_api.USER_ID_HEADER] == "42"
    assert headers[content_api.INTERNAL_KEY_HEADER] == "test-key"
    assert headers[content_api.EDIT_SOURCE_HEADER] == "ai"


def test_unwrap_result():
    assert content_api.unwrap_result({"code": 200, "data": [{"id": "1"}]}) == [{"id": "1"}]
    assert content_api.unwrap_result({"memory": {}}) == {"memory": {}}


def test_unwrap_story_memory():
    payload = {"code": 200, "data": {"novel_id": "n1", "memory": {"world": {"a": "b"}}}}
    assert content_api.unwrap_story_memory(payload) == {"world": {"a": "b"}}
