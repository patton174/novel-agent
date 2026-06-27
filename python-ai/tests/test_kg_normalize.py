"""kg normalize 单测。"""

from __future__ import annotations

from app.kg.normalize import merge_extraction, normalize_name


def test_normalize_strips_parens():
    assert normalize_name("林动(少年)") == "林动"
    assert normalize_name("张三（青年时期）") == "张三"


def test_normalize_strips_quotes_and_spaces():
    assert normalize_name(' "林动" ') == "林动"
    assert normalize_name("林 动") == "林动"


def test_normalize_empty():
    assert normalize_name("") == ""
    assert normalize_name("   ") == ""


def test_merge_dedupes_entities_by_normalized_name():
    blocks = [
        {
            "entities": [
                {"name": "林动(少年)", "type": "character"},
                {"name": "林动", "type": "character"},
            ],
            "relations": [],
        },
    ]
    result = merge_extraction(blocks)
    assert len(result["entities"]) == 1
    assert result["entities"][0]["name"] == "林动"
    assert "林动(少年)" in (result["entities"][0]["aliases"] or "")


def test_merge_dedupes_relations():
    blocks = [
        {
            "entities": [],
            "relations": [
                {"src": "林动", "rel": "师承", "dst": "应欢欢"},
                {"src": "林动(少年)", "rel": "师承", "dst": "应欢欢"},
            ],
        },
    ]
    result = merge_extraction(blocks)
    assert len(result["relations"]) == 1
    assert result["relations"][0]["src"] == "林动"


def test_merge_across_blocks():
    blocks = [
        {"entities": [{"name": "林动", "type": "character"}], "relations": []},
        {
            "entities": [{"name": "应欢欢", "type": "character"}],
            "relations": [{"src": "林动", "rel": "师承", "dst": "应欢欢"}],
        },
    ]
    result = merge_extraction(blocks)
    assert len(result["entities"]) == 2
    assert len(result["relations"]) == 1
