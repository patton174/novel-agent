"""Tests for chapter position helpers."""

from app.agent.tools.chapter_position import (
    apply_moves,
    build_reorder_ids,
    duplicate_title_groups,
    insert_id_at_position,
    resolve_target_position,
)


def _rows(*items: tuple[str, str, int]):
    return [
        {"id": cid, "title": title, "sort_order": order, "word_count": 10}
        for cid, title, order in items
    ]


def test_resolve_append_for_new_chapter():
    rows = _rows(("a", "第一章", 1), ("b", "第二章", 2))
    pos, err = resolve_target_position(rows, chapter_id="")
    assert err is None
    assert pos == 3


def test_resolve_after_chapter_id():
    rows = _rows(("a", "第一章", 1), ("b", "第二章", 2), ("c", "第三章", 3))
    pos, err = resolve_target_position(rows, chapter_id="new", after_chapter_id="a")
    assert err is None
    assert pos == 2


def test_insert_id_at_position():
    ids = ["a", "b", "c"]
    assert insert_id_at_position(ids, "x", 2) == ["a", "x", "b", "c"]
    assert insert_id_at_position(ids, "b", 1) == ["b", "a", "c"]


def test_apply_moves_partial():
    ids = ["a", "b", "c", "d"]
    moved, err = apply_moves(ids, [("d", 1)])
    assert err is None
    assert moved == ["d", "a", "b", "c"]


def test_build_reorder_appends_missing_ids():
    rows = _rows(("a", "第一章", 1), ("b", "第二章", 2), ("c", "第三章", 3))
    ids, err = build_reorder_ids(rows, chapter_ids=["b", "a"])
    assert err is None
    assert ids == ["b", "a", "c"]


def test_strip_chapter_number_prefix():
    from app.agent.backend.chapter_title import (
        strip_chapter_number_prefix,
        title_has_chapter_number_prefix,
    )

    assert strip_chapter_number_prefix("第8章 雨中") == "雨中"
    assert strip_chapter_number_prefix("第八章：觉醒") == "觉醒"
    assert strip_chapter_number_prefix("Chapter 3 - Dawn") == "Dawn"
    assert strip_chapter_number_prefix("神级天赋") == "神级天赋"
    assert title_has_chapter_number_prefix("第1章 开端") is True
    assert title_has_chapter_number_prefix("开端") is False


def test_audit_chapter_catalog():
    from app.agent.tools.chapter_position import audit_chapter_catalog

    rows = _rows(
        ("a", "第1章 神级天赋", 1),
        ("b", "神级天赋", 2),
        ("c", "空白", 3),
    )
    rows[2]["word_count"] = 0
    report = audit_chapter_catalog(rows)
    assert report["ok"] is False
    assert "神级天赋" in report["duplicate_titles"]
    assert report["empty_chapters"]
    assert report["title_has_chapter_number"]
