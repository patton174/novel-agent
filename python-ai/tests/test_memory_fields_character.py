"""Character scope memory field normalization."""

from app.agent.harness.memory_fields import memory_fields_from_mapping
from app.runtime.story_memory import patch_story_memory, read_story_memory_item


def test_character_fields_passthrough_without_item_id():
    scope, key, value, item_id = memory_fields_from_mapping(
        {
            "scope": "character",
            "key": "林叔",
            "value": "边境商人，散人联盟成员。",
        }
    )
    assert scope == "character"
    assert item_id is None
    assert key == "林叔"
    assert value


def test_character_write_fuzzy_match_by_name_key():
    sid = "test_session_char_fuzzy_name"
    patch_story_memory(
        sid,
        scope="character",
        key="林枫",
        value="冷静",
        item_id="林枫",
    )
    result = patch_story_memory(
        sid,
        scope="character",
        key="林",
        value="边境老猎人，性格更沉稳。",
    )
    assert result["ok"] is True
    assert result["item_id"] == "林枫"
    assert result["key"] == "人物卡"
    card = read_story_memory_item(sid, scope="character", key="林枫")
    assert card["ok"] is True
    assert "边境老猎人" in card["entries"]["人物卡"]


def test_character_write_field_still_needs_item_id_or_name_key():
    sid = "test_session_char_field_only"
    result = patch_story_memory(sid, scope="character", key="性格", value="冷静")
    assert result["ok"] is False
    assert "角色名" in result["reason"] or "item_id" in result["reason"]
