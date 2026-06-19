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


def test_read_chapter_ui_excerpt_line_count():
    body = add_line_numbers("a\nb\nc\n")
    assert read_chapter_ui_excerpt(body, {}) == "已读取 3 行"


def test_read_chapter_ui_excerpt_unchanged():
    assert "未变更" in read_chapter_ui_excerpt(FILE_UNCHANGED_STUB, {})


def test_list_chapters_ui_excerpt_json():
    inv = '{"chapters": [{"chapter_id": "a", "title": "第一章"}, {"chapter_id": "b", "title": "第二章"}]}'
    excerpt = list_chapters_ui_excerpt(inv, {})
    assert "第一章" in excerpt


def test_read_memory_ui_excerpt_title():
    text = "# 力量体系\n\n灵气修炼等级…"
    assert "力量体系" in read_memory_ui_excerpt(text, {})


def test_get_memory_tree_ui_excerpt_scope_and_nodes():
    payload = {
        "scope": "角色设定",
        "count": 2,
        "nodes": [
            {"title": "林逸", "memory_id": "1", "children": []},
            {"title": "苏婉", "memory_id": "2", "children": []},
        ],
    }
    excerpt = get_memory_tree_ui_excerpt(json.dumps(payload, ensure_ascii=False), {})
    assert "角色设定" in excerpt
    assert "林逸" in excerpt
    assert "{" not in excerpt


def test_delete_memory_ui_excerpt_uses_title_from_json():
    payload = {"ok": True, "memory_id": "2067645279842054146", "title": "林逸", "cascade": True}
    excerpt = delete_memory_ui_excerpt(json.dumps(payload), {"memory_id": payload["memory_id"]})
    assert excerpt == "已删除记忆：林逸"
    assert "{" not in excerpt
