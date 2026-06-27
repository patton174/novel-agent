"""Tests for skill metadata helpers."""

from __future__ import annotations

from app.agent.context.skill_metadata import merge_skill_metadata, skill_metadata_from_api


def test_skill_metadata_from_api():
    meta = skill_metadata_from_api(
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "fanqie-hook",
            "description": "章末钩子",
            "version": 2,
            "is_system": True,
            "enabled": True,
        }
    )
    assert meta["name"] == "fanqie-hook"
    assert meta["version"] == 2
    assert meta["enabled"] is True


def test_merge_skill_metadata_skips_duplicate():
    existing = [{"id": "abc", "name": "hook"}]
    assert merge_skill_metadata(existing, {"id": "abc", "name": "hook"}) is None


def test_merge_skill_metadata_appends_new():
    existing = [{"id": "abc", "name": "hook"}]
    merged = merge_skill_metadata(existing, {"id": "def", "name": "beat"})
    assert merged is not None
    assert len(merged) == 2
