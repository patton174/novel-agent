"""expand_memory_writes flattens nested JSON from agent output."""

from app.agent.harness.memory_fields import expand_memory_writes


def test_expand_character_json_card_into_flat_fields():
    value = '{"身份":"边境猎人","性格":"沉稳","name":"林枫"}'
    rows = expand_memory_writes("character", "人物卡", value, None)
    keys = {r[1] for r in rows}
    assert "身份" in keys
    assert "性格" in keys
    assert rows[0][3] == "林枫"


def test_expand_world_json_into_multiple_keys():
    value = '{"世界观框架":"近未来","核心设定":"赛博朋克"}'
    rows = expand_memory_writes("world", "世界观", value, None)
    assert len(rows) == 2
    assert {r[1] for r in rows} == {"世界观框架", "核心设定"}


def test_plain_string_passthrough():
    rows = expand_memory_writes("world", "时代背景", "2077", None)
    assert rows == [("world", "时代背景", "2077", None)]
