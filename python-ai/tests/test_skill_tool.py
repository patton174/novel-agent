"""Tests for Skill tool — platform API only (no bundled fallback in production)."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest

from app.agent.schemas import AgentRunContext
from app.agent.tools.schemas import SkillInput
from app.agent.tools.skill import invoke_skill


def _ctx(**updates) -> AgentRunContext:
    base = dict(
        run_id="run_1",
        session_id="sess_1",
        message_id="msg_1",
        user_id=42,
    )
    base.update(updates)
    return AgentRunContext(**base)


@pytest.fixture(autouse=True)
def _api_configured():
    with patch("app.agent.tools.skill._api_configured", return_value=True):
        yield


@pytest.mark.asyncio
async def test_invoke_skill_api_success_by_slug():
    api_payload = {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "fanqie-chapter-hook",
        "description": "Hook",
        "locale": "zh",
        "tools": ["WriteChapter"],
        "version": 1,
        "content": "# 章末钩子\n\n制造悬念。",
    }
    with patch(
        "app.agent.tools.skill.skill_api.fetch_skill",
        new=AsyncMock(return_value=api_payload),
    ):
        result = await invoke_skill(_ctx(), SkillInput(skill="fanqie-chapter-hook"))
    assert not result.is_error
    data = json.loads(result.content)
    assert data["skill"] == "fanqie-chapter-hook"
    assert data["loaded"] is True
    assert "章末" in result.context_patch["skill_prompt"]
    assert result.context_patch["last_skill"] == "fanqie-chapter-hook"
    assert result.sse_events[0]["type"] == "skill.started"
    assert result.sse_events[1]["type"] == "skill.loaded"


@pytest.mark.asyncio
async def test_invoke_skill_appends_existing_prompt():
    api_payload = {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "mystery-cold-open",
        "version": 1,
        "content": "# 悬疑冷开场\n\n从冲突切入。",
    }
    with patch(
        "app.agent.tools.skill.skill_api.fetch_skill",
        new=AsyncMock(return_value=api_payload),
    ):
        result = await invoke_skill(
            _ctx(skill_prompt="Existing instructions"),
            SkillInput(skill="mystery-cold-open"),
        )
    merged = result.context_patch["skill_prompt"]
    assert merged.startswith("Existing instructions")
    assert "悬疑冷开场" in merged


@pytest.mark.asyncio
async def test_invoke_skill_api_not_found():
    with patch(
        "app.agent.tools.skill.skill_api.fetch_skill",
        new=AsyncMock(side_effect=RuntimeError("HTTP 404")),
    ):
        result = await invoke_skill(_ctx(), SkillInput(skill="missing-skill-slug"))
    assert result.is_error
    assert "404" in result.content
    assert result.sse_events[-1]["type"] == "skill.failed"


@pytest.mark.asyncio
async def test_invoke_skill_http_fetch_success_by_id():
    api_payload = {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "custom-hook",
        "description": "Custom",
        "locale": "zh",
        "tools": ["WriteChapter"],
        "version": 2,
        "content": "# Custom body\n\nFrom API.",
    }
    with patch(
        "app.agent.tools.skill.skill_api.fetch_skill",
        new=AsyncMock(return_value=api_payload),
    ):
        result = await invoke_skill(
            _ctx(),
            SkillInput(skill_id="550e8400-e29b-41d4-a716-446655440000"),
        )
    assert not result.is_error
    assert result.context_patch["last_skill"] == "custom-hook"
    assert "From API." in result.context_patch["skill_prompt"]
    assert result.sse_events[0]["payload"]["skill"]["id"] == (
        "550e8400-e29b-41d4-a716-446655440000"
    )


@pytest.mark.asyncio
async def test_invoke_skill_api_not_configured():
    with patch("app.agent.tools.skill._api_configured", return_value=False):
        result = await invoke_skill(_ctx(), SkillInput(skill="any-skill"))
    assert result.is_error
    assert "not configured" in result.content
    assert result.sse_events[-1]["type"] == "skill.failed"
