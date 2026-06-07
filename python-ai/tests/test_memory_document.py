import pytest

from app.agent.backend.memory_document import (
    MemoryDocumentError,
    envelope_to_storage_fields,
    validate_memory_document,
)
from app.runtime.story_memory import delete_story_memory_item, get_story_memory, patch_story_memory


def test_validate_memory_document_requires_v1():
    with pytest.raises(MemoryDocumentError):
        validate_memory_document({"data": {}}, scope="world", entry_id="rules")


def test_character_requires_identity_and_personality():
    with pytest.raises(MemoryDocumentError, match="身份"):
        validate_memory_document(
            {
                "v": 1,
                "title": "唐云",
                "data": {"性格": "冷静"},
            },
            scope="character",
            entry_id="Tang_Yun",
        )


def test_envelope_to_storage_fields_character_flat():
    env = validate_memory_document(
        {
            "v": 1,
            "title": "唐云",
            "summary": "男主",
            "data": {"身份": "散修", "性格": "冷静", "外貌": "青衫"},
        },
        scope="character",
        entry_id="Tang_Yun",
    )
    fields = envelope_to_storage_fields(env, scope="character")
    assert fields["身份"] == "散修"
    assert fields["性格"] == "冷静"
    assert fields["外貌"] == "青衫"
    assert "人物卡" not in fields


def test_world_requires_body():
    with pytest.raises(MemoryDocumentError, match="body"):
        validate_memory_document(
            {"v": 1, "title": "势力", "data": {"备注": "x"}},
            scope="world",
            entry_id="factions",
        )


def test_world_body_maps_to_storage():
    env = validate_memory_document(
        {
            "v": 1,
            "title": "势力",
            "data": {"body": "## 设定\n正文"},
        },
        scope="world",
        entry_id="factions",
    )
    fields = envelope_to_storage_fields(env, scope="world")
    assert fields["正文"] == "## 设定\n正文"


def test_chapter_requires_summary_key():
    with pytest.raises(MemoryDocumentError, match="摘要"):
        validate_memory_document(
            {"v": 1, "title": "第1章", "data": {"伏笔": "…"}},
            scope="chapter",
            entry_id="ch1",
        )


def test_delete_character_with_empty_key_and_item_id():
    sid = "test_vfs_char_del_empty_key"
    patch_story_memory(
        sid,
        scope="character",
        key="性格",
        value="冷静",
        item_id="苏晚",
    )
    deleted = delete_story_memory_item(
        sid, scope="character", key="", item_id="苏晚"
    )
    assert deleted.get("ok") is True
    roster = get_story_memory(sid)
    assert "苏晚" not in roster["characters"]
