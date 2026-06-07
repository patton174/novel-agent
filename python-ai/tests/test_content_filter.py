"""Tests for the Novel AI Service."""

import pytest

from app.config import settings


def test_settings():
    """Test that settings can be loaded."""
    assert settings is not None
    assert settings.max_tokens > 0
    assert settings.request_timeout > 0


def test_llm_provider_default():
    """Test default LLM provider configuration."""
    assert settings.default_llm_provider in ["deepseek", "openai"]


@pytest.mark.asyncio
async def test_content_filter():
    """Test content filter basic functionality."""
    from app.tools.content_filter import ContentFilter

    filter = ContentFilter()

    # Test clean content
    assert not filter.contains_problematic_content("This is a clean text.")

    # Test content with added pattern
    filter.add_pattern("badword")
    assert filter.contains_problematic_content("This contains badword in it.")


@pytest.mark.asyncio
async def test_trie_filter():
    """Test Trie-based sensitive word filter."""
    from app.tools.content_filter import SensitiveWordFilter

    trie = SensitiveWordFilter()
    trie.add_words(["hello", "world"])

    assert trie.contains_word("hello world")
    assert not trie.contains_word("foo bar")
    assert "hello" in trie.find_all_matches("say hello to the world")