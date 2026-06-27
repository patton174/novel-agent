"""Tests for RUN_CONTEXT skills block."""

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


def test_run_context_without_skill_prompt_omits_skills_block():
    payload = assemble_agent_context(_ctx())
    assert "skills" not in payload


def test_run_context_with_skill_prompt_includes_skills_block():
    payload = assemble_agent_context(
        _ctx(
            skill_prompt="## Skill: hook\n\nKeep suspense.",
            skill_ids=[{"id": "abc", "name": "fanqie-chapter-hook"}],
        )
    )
    assert "skills" in payload
    assert payload["skills"]["active"] == ["fanqie-chapter-hook"]
    assert "Keep suspense." in payload["skills"]["prompt"]


def test_run_context_reads_skill_prompt_from_context_patch():
    payload = assemble_agent_context(
        _ctx(
            context_patch={
                "skill_prompt": "Patch skill body",
                "skill_ids": [{"name": "sweet-romance-beat"}],
            }
        )
    )
    assert payload["skills"]["active"] == ["sweet-romance-beat"]
    assert payload["skills"]["prompt"] == "Patch skill body"
