"""Tests for profile_loader HTTP + bundled fallback."""

from __future__ import annotations

import pytest

from app.agent.harness.profile_loader import (
    AgentProfileModel,
    build_subagent_system_prompt,
    clear_profile_cache,
    fetch_profile,
    load_bundled_profile,
)


@pytest.fixture(autouse=True)
def _clear_cache():
    clear_profile_cache()
    yield
    clear_profile_cache()


@pytest.mark.asyncio
async def test_fetch_profile_bundled_fallback(monkeypatch):
    async def _fail(_pid, _uid):
        raise RuntimeError("HTTP down")

    monkeypatch.setattr(
        "app.agent.harness.profile_loader.profile_api.fetch_profile",
        _fail,
    )
    profile = await fetch_profile("chapter-writer", 1)
    assert profile.id == "chapter-writer"
    assert "WriteChapter" in profile.tool_allowlist


@pytest.mark.asyncio
async def test_fetch_profile_http_then_cache(monkeypatch):
    calls = {"n": 0}

    async def _ok(_pid, _uid):
        calls["n"] += 1
        return {
            "id": "custom-writer",
            "display_name": "自定义写手",
            "system_prompt_template": "You are {display_name}. Tools: {tool_list}",
            "tool_allowlist": ["ReadChapter"],
            "max_turns": 8,
            "skill_ids": [],
        }

    monkeypatch.setattr(
        "app.agent.harness.profile_loader.profile_api.fetch_profile",
        _ok,
    )
    first = await fetch_profile("custom-writer", 1)
    second = await fetch_profile("custom-writer", 1)
    assert calls["n"] == 1
    assert first.display_name == "自定义写手"
    assert second.id == first.id


@pytest.mark.asyncio
async def test_unknown_profile_falls_back_to_chapter_writer(monkeypatch):
    async def _fail(_pid, _uid):
        raise RuntimeError("HTTP down")

    monkeypatch.setattr(
        "app.agent.harness.profile_loader.profile_api.fetch_profile",
        _fail,
    )
    profile = await fetch_profile("does-not-exist-profile", 1)
    assert profile.id == "chapter-writer"


def test_load_bundled_continuity_reviewer():
    profile = load_bundled_profile("continuity-reviewer")
    assert profile is not None
    assert profile.id == "continuity-reviewer"
    assert "NarrativeReview" in profile.tool_allowlist
    assert "WriteChapter" not in profile.tool_allowlist


def test_build_subagent_system_prompt_renders_template():
    profile = AgentProfileModel(
        id="test",
        display_name="测试子 Agent",
        system_prompt_template="Role: {display_name}. Tools: {tool_list}. Max {max_turns}.",
        tool_allowlist=["ReadChapter"],
        max_turns=5,
    )
    text = build_subagent_system_prompt(profile)
    assert "测试子 Agent" in text
    assert "ReadChapter" in text
    assert "5" in text
