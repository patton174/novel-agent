"""Tests for RUN_CONTEXT skills block (CC lazy-load)."""

from __future__ import annotations

from app.agent.context.prompting.run_context import assemble_agent_context
from app.agent.schemas import AgentRunContext


def _ctx(**updates) -> AgentRunContext:
    base = dict(
        run_id="run_1",
        session_id="sess_1",
        message_id="msg_1",
        user_id=1,
    )
    base.update(updates)
    return AgentRunContext(**base)


def test_run_context_without_skills_omits_skills_block():
    payload = assemble_agent_context(_ctx())
    assert "skills" not in payload


def test_run_context_with_skill_metadata_shows_catalog_only():
    payload = assemble_agent_context(
        _ctx(
            skill_ids=[
                {
                    "id": "abc",
                    "name": "fanqie-chapter-hook",
                    "description": "章末悬念",
                }
            ]
        )
    )
    assert "skills" in payload
    assert payload["skills"]["active"] == ["fanqie-chapter-hook"]
    assert "fanqie-chapter-hook" in payload["skills"]["catalog"]
    assert "loaded" not in payload["skills"]
    assert "catalog" in payload["skills"]
    assert "Skill 工具" in payload["skills"]["hint"]


def test_run_context_user_specified_omits_catalog():
    payload = assemble_agent_context(
        _ctx(
            skill_prompt="## Skill: hook\n\nKeep suspense.",
            skill_ids=[{"id": "abc", "name": "fanqie-chapter-hook", "description": "章末悬念"}],
        )
    )
    assert payload["skills"]["active"] == ["fanqie-chapter-hook"]
    assert "Keep suspense." in payload["skills"]["loaded"]
    assert "catalog" not in payload["skills"]
    assert "skills.loaded" in payload["skills"]["hint"]


def test_run_context_reads_skill_metadata_from_context_patch():
    payload = assemble_agent_context(
        _ctx(
            context_patch={
                "skill_ids": [
                    {"name": "sweet-romance-beat", "description": "甜宠节奏"}
                ]
            }
        )
    )
    assert payload["skills"]["active"] == ["sweet-romance-beat"]
    assert "sweet-romance-beat" in payload["skills"]["catalog"]
    assert "loaded" not in payload["skills"]


def test_run_context_reads_loaded_body_from_context_patch():
    payload = assemble_agent_context(
        _ctx(
            context_patch={
                "skill_prompt": "Patch skill body",
                "skill_ids": [{"name": "sweet-romance-beat"}],
            }
        )
    )
    assert payload["skills"]["loaded"] == "Patch skill body"
