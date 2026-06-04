"""Tests for story memory CRUD helpers."""

from app.runtime.story_memory import (
    delete_story_memory_item,
    get_story_memory,
    patch_story_memory,
    read_story_memory_item,
)


def test_memory_scope_alias_worldbuilding():
    sid = "test_session_worldbuilding_alias"
    created = patch_story_memory(
        sid, scope="worldbuilding", key="核心机制", value="无限掉宝"
    )
    assert created["ok"] is True
    assert created["scope"] == "world"

    read_one = read_story_memory_item(sid, scope="world", key="核心机制")
    assert read_one["ok"] is True
    assert read_one["value"] == "无限掉宝"


def test_memory_crud_world_scope():
    sid = "test_session_crud"
    created = patch_story_memory(sid, scope="world", key="时代背景", value="近未来赛博朋克")
    assert created["ok"] is True

    read_one = read_story_memory_item(sid, scope="world", key="时代背景")
    assert read_one["ok"] is True
    assert read_one["value"] == "近未来赛博朋克"

    read_all = read_story_memory_item(sid, scope="world")
    assert read_all["ok"] is True
    assert "时代背景" in read_all["entries"]

    updated = patch_story_memory(sid, scope="world", key="时代背景", value="2077 夜之城")
    assert updated["changed"] is True

    deleted = delete_story_memory_item(sid, scope="world", key="时代背景")
    assert deleted["ok"] is True

    missing = read_story_memory_item(sid, scope="world", key="时代背景")
    assert missing["ok"] is False


def test_memory_crud_character_scope():
    sid = "test_session_char"
    patch_story_memory(
        sid,
        scope="character",
        key="性格",
        value="冷静",
        item_id="林枫",
    )
    item = read_story_memory_item(sid, scope="character", item_id="林枫")
    assert item["ok"] is True
    assert item["entries"]["性格"] == "冷静"

    roster = read_story_memory_item(sid, scope="character")
    assert roster["ok"] is True
    assert "林枫" in roster["item_ids"]
    assert "林枫" in roster["entries"]

    snapshot = get_story_memory(sid)
    assert "林枫" in snapshot["characters"]


def test_memory_character_write_by_name_key():
    sid = "test_session_char_require_id"
    patch_story_memory(
        sid,
        scope="character",
        key="林枫",
        value="冷静",
        item_id="林枫",
    )
    result = patch_story_memory(sid, scope="character", key="林枫", value="更冷静")
    assert result["ok"] is True
    assert result["item_id"] == "林枫"
    assert result["key"] == "人物卡"


def test_memory_character_field_without_item_id_fails():
    sid = "test_session_char_field_only"
    result = patch_story_memory(sid, scope="character", key="性格", value="冷静")
    assert result["ok"] is False


def test_memory_character_read_single_requires_item_id():
    sid = "test_session_char_read_require_id"
    patch_story_memory(
        sid,
        scope="character",
        key="性格",
        value="冷静",
        item_id="林枫",
    )
    missing = read_story_memory_item(sid, scope="character", key="性格")
    assert missing["ok"] is False
    assert "item_id required" in missing["reason"]


def test_memory_world_read_by_item_id_returns_targeted_key():
    sid = "test_session_world_item_id"
    patch_story_memory(
        sid,
        scope="world",
        key="worldview",
        value="世界观框架内容",
    )
    patch_story_memory(
        sid,
        scope="world",
        key="core_settings",
        value="核心设定内容",
    )
    read_view = read_story_memory_item(sid, scope="world", item_id="worldview")
    read_core = read_story_memory_item(sid, scope="world", item_id="core_settings")
    assert read_view["ok"] is True
    assert read_core["ok"] is True
    assert read_view["key"] == "worldview"
    assert read_core["key"] == "core_settings"
    assert read_view["value"] == "世界观框架内容"
    assert read_core["value"] == "核心设定内容"


def test_memory_world_read_large_value_uses_rag_chunks():
    sid = "test_session_world_rag"
    long_body = "\n\n".join(
        [
            "虚界降临发生在三百年前，法则开始渗透现实。",
            "末法时代普通人生活困苦，资源被势力垄断。",
            "守序者一族掌握法则权限，与散人联盟对立。",
        ]
    )
    patch_story_memory(sid, scope="world", key="core_settings", value=long_body * 40)
    result = read_story_memory_item(
        sid,
        scope="world",
        item_id="core_settings",
        query="末法时代 普通人",
    )
    assert result["ok"] is True
    assert result.get("retrieved") is True
    assert "末法时代" in result["value"]
    assert len(result["value"]) < len(long_body * 40)


def test_memory_delete_character_whole_item():
    sid = "test_session_char_del"
    patch_story_memory(
        sid,
        scope="character",
        key="人物卡",
        value='{"身份":"女主"}',
        item_id="苏晚",
    )
    patch_story_memory(
        sid,
        scope="character",
        key="人物卡",
        value='{"身份":"男主"}',
        item_id="唐云",
    )
    deleted = delete_story_memory_item(
        sid, scope="character", key="*", item_id="苏晚"
    )
    assert deleted["ok"] is True
    roster = read_story_memory_item(sid, scope="character")
    assert "苏晚" not in roster["item_ids"]
    assert "唐云" in roster["item_ids"]
