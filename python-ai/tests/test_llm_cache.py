"""Tests for MiniMax prompt cache helpers."""

from app.core.llm_cache import cached_system_content, prompt_cache_enabled


def test_cached_system_content_anthropic_enabled(monkeypatch):
    monkeypatch.setattr("app.core.llm_cache.settings.llm_prompt_cache", True)
    monkeypatch.setattr("app.core.llm_cache.settings.llm_protocol", "anthropic")
    assert prompt_cache_enabled() is True
    blocks = cached_system_content("static planner rules")
    assert isinstance(blocks, list)
    assert blocks[0]["cache_control"] == {"type": "ephemeral"}


def test_cached_system_content_disabled_returns_plain_string(monkeypatch):
    monkeypatch.setattr("app.core.llm_cache.settings.llm_prompt_cache", False)
    text = cached_system_content("plain")
    assert text == "plain"
