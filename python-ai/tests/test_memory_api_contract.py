"""Tests for story-memory API contract alignment."""

from app.agent.backend.memory_api_contract import (
    list_memory_entries_from_tree,
    resolve_delete_api_payload,
    resolve_patch_api_payload,
)


def test_delete_character_by_list_memory_key():
    characters = {
        "江雪晴": {"身份": "校花", "性格": "外冷内热"},
        "沈逸": {"身份": "新生"},
    }
    scope, key, item_id = resolve_delete_api_payload(
        scope="character",
        key="江雪晴",
        characters=characters,
    )
    assert scope == "character"
    assert key == "*"
    assert item_id == "江雪晴"


def test_delete_character_field_requires_item_id():
    characters = {"林枫": {"性格": "冷静"}}
    result = resolve_delete_api_payload(
        scope="character",
        key="性格",
        characters=characters,
    )
    assert result[0] is None
    assert "item_id required" in str(result[2])


def test_delete_character_field_with_item_id():
    characters = {"林枫": {"性格": "冷静"}}
    scope, key, item_id = resolve_delete_api_payload(
        scope="character",
        key="性格",
        item_id="林枫",
        characters=characters,
    )
    assert scope == "character"
    assert key == "性格"
    assert item_id == "林枫"


def test_delete_world_flat_key():
    scope, key, item_id = resolve_delete_api_payload(
        scope="world",
        key="时代背景",
    )
    assert scope == "world"
    assert key == "时代背景"
    assert item_id == ""


def test_delete_chapter_by_list_memory_key():
    chapters = {"ch-1": {"摘要": "开篇"}, "ch-2": {"摘要": "转折"}}
    scope, key, item_id = resolve_delete_api_payload(
        scope="chapter",
        key="ch-1",
        chapters=chapters,
    )
    assert scope == "chapter"
    assert key == "*"
    assert item_id == "ch-1"


def test_patch_character_by_name():
    characters = {"江雪晴": {"性格": "外冷内热"}}
    scope, key, item_id = resolve_patch_api_payload(
        scope="character",
        key="江雪晴",
        characters=characters,
    )
    assert scope == "character"
    assert key == "人物卡"
    assert item_id == "江雪晴"


def test_list_memory_entries_nested_metadata():
    tree = {
        "world": {"设定": "现代"},
        "characters": {"林枫": {"性格": "冷静"}},
        "chapters": {"ch-1": {"摘要": "开篇"}},
    }
    entries = list_memory_entries_from_tree(tree)
    assert {"scope": "world", "key": "设定", "kind": "entry"} in entries
    assert {
        "scope": "character",
        "key": "林枫",
        "item_id": "林枫",
        "kind": "item",
    } in entries
    assert {
        "scope": "chapter",
        "key": "ch-1",
        "item_id": "ch-1",
        "kind": "item",
    } in entries
