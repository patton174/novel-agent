"""Tests for CC-aligned skill catalog formatting."""

from __future__ import annotations

from app.agent.context.skill_catalog import format_skills_within_budget


def test_format_skills_empty():
    assert format_skills_within_budget([]) == ""


def test_format_skills_includes_name_and_description():
    catalog = format_skills_within_budget(
        [{"name": "fanqie-hook", "description": "章末悬念钩子"}]
    )
    assert "- fanqie-hook: 章末悬念钩子" in catalog


def test_format_skills_truncates_long_description():
    long_desc = "x" * 400
    catalog = format_skills_within_budget([{"name": "big-skill", "description": long_desc}])
    assert catalog.startswith("- big-skill:")
    assert len(catalog.split(": ", 1)[1]) <= 250


def test_format_skills_within_tight_budget_falls_back_to_names():
    skills = [
        {"name": f"skill-{i}", "description": "d" * 300}
        for i in range(40)
    ]
    catalog = format_skills_within_budget(skills, context_window_tokens=1000)
    assert "skill-0" in catalog
    assert all(f"skill-{i}" in catalog for i in range(5))
