"""CC-aligned per-tool UI excerpts."""

import json

from app.agent.backend.format import FILE_UNCHANGED_STUB, add_line_numbers
from app.agent.harness.tool_ui import (
    delete_memory_ui_excerpt,
    get_memory_tree_ui_excerpt,
    list_chapters_ui_excerpt,
    read_chapter_ui_excerpt,
    read_memory_ui_excerpt,
)


def test_read_chapter_ui_excerpt_title_only():
    body = "---\ntitle: 第1章\nchapter_id: x\n---\n\n正文"
    numbered = add_line_numbers(body)
    assert read_chapter_ui_excerpt(numbered, {}) == "《第1章》"


def test_read_chapter_ui_excerpt_unchanged():
    assert "未变更" in read_chapter_ui_excerpt(FILE_UNCHANGED_STUB, {})


def test_list_chapters_ui_excerpt_json():
    inv = '{"chapters": [{"chapter_id": "a", "title": "第一章"}, {"chapter_id": "b", "title": "第二章"}]}'
    excerpt = list_chapters_ui_excerpt(inv, {})
    assert excerpt == "第一章、第二章"


def test_list_chapters_ui_excerpt_truncates_to_three():
    inv = json.dumps(
        {
            "chapters": [
                {"chapter_id": str(i), "title": f"第{i}章"}
                for i in range(1, 6)
            ]
        },
        ensure_ascii=False,
    )
    excerpt = list_chapters_ui_excerpt(inv, {})
    assert excerpt == "第1章、第2章、第3章…"


def test_read_memory_ui_excerpt_title():
    text = "# 力量体系\n\n灵气修炼等级…"
    assert read_memory_ui_excerpt(text, {}) == "力量体系"


def test_get_memory_tree_ui_excerpt_titles_only():
    payload = {
        "scope": "角色设定",
        "count": 2,
        "nodes": [
            {"title": "林逸", "memory_id": "1", "children": []},
            {"title": "苏婉", "memory_id": "2", "children": []},
        ],
    }
    excerpt = get_memory_tree_ui_excerpt(json.dumps(payload, ensure_ascii=False), {})
    assert excerpt == "林逸、苏婉"
    assert "角色设定" not in excerpt
    assert "{" not in excerpt


def test_delete_memory_ui_excerpt_uses_title_from_json():
    payload = {"ok": True, "memory_id": "2067645279842054146", "title": "林逸", "cascade": True}
    excerpt = delete_memory_ui_excerpt(json.dumps(payload), {"memory_id": payload["memory_id"]})
    assert excerpt == "林逸"
    assert "{" not in excerpt
