"""Tests for skills_block builder."""

from __future__ import annotations

from app.agent.context.prompting.skills_block import build_skills_block


def test_catalog_only_when_no_loaded_body():
    block = build_skills_block(
        [{"name": "hook", "description": "悬念"}],
        "",
    )
    assert block is not None
    assert "catalog" in block
    assert "loaded" not in block
    assert "Skill 工具" in block["hint"]


def test_user_specified_omits_catalog():
    block = build_skills_block(
        [{"name": "hook", "description": "悬念"}],
        "Follow hook instructions.",
    )
    assert block is not None
    assert block["loaded"] == "Follow hook instructions."
    assert "catalog" not in block
    assert "skills.loaded" in block["hint"]
