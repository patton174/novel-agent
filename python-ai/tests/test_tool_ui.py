"""CC-aligned per-tool UI excerpts."""

import json

from app.agent.backend.format import FILE_UNCHANGED_STUB, add_line_numbers
from app.agent.harness.tool_ui import (
    create_memory_ui_excerpt,
    delete_chapter_ui_excerpt,
    delete_memory_ui_excerpt,
    edit_chapter_ui_excerpt,
    get_memory_tree_ui_excerpt,
    list_chapters_ui_excerpt,
    read_chapter_ui_excerpt,
    read_memory_ui_excerpt,
    reorder_chapters_ui_excerpt,
    resolve_tool_result_title,
    skill_ui_excerpt,
    write_chapter_ui_excerpt,
)


def test_read_chapter_ui_excerpt_title_only():
    body = "---\ntitle: 第1章\nchapter_id: x\n---\n\n正文"
    numbered = add_line_numbers(body)
    assert read_chapter_ui_excerpt(numbered, {}) == "《第1章》"


def test_read_chapter_ui_excerpt_uses_tool_input_title():
    numbered = "     1| 正文\n     2| 更多"
    assert read_chapter_ui_excerpt(numbered, {"title": "码农的平凡日常"}) == "《码农的平凡日常》"


def test_read_chapter_ui_excerpt_uses_tool_input_index():
    numbered = "     1| 正文"
    assert read_chapter_ui_excerpt(numbered, {"index": 1}) == "第1章"


def test_read_chapter_ui_excerpt_line_numbered_body_without_frontmatter():
    numbered = "     1| 第一段\n     2| 第二段"
    assert read_chapter_ui_excerpt(numbered, {"title": "码农的平凡日常"}) == "《码农的平凡日常》"
    assert read_chapter_ui_excerpt(numbered, {}) == "已读取"


def test_read_chapter_ui_excerpt_unchanged():
    assert "未变更" in read_chapter_ui_excerpt(FILE_UNCHANGED_STUB, {})


def test_list_chapters_ui_excerpt_json():
    inv = '{"chapters": [{"chapter_id": "a", "title": "第一章"}, {"chapter_id": "b", "title": "第二章"}]}'
    excerpt = list_chapters_ui_excerpt(inv, {})
    assert excerpt == "2 章"


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
    assert excerpt == "5 章"


def test_read_memory_ui_excerpt_title():
    text = "# 力量体系\n\n灵气修炼等级…"
    assert read_memory_ui_excerpt(text, {}) == "力量体系"


def test_get_memory_tree_ui_excerpt_scope_count():
    payload = {
        "scope": "角色设定",
        "count": 2,
        "nodes": [
            {"title": "林逸", "memory_id": "1", "children": []},
            {"title": "苏婉", "memory_id": "2", "children": []},
        ],
    }
    excerpt = get_memory_tree_ui_excerpt(json.dumps(payload, ensure_ascii=False), {})
    assert excerpt == "角色设定 · 2 项"


def test_delete_memory_ui_excerpt_uses_title_from_json():
    payload = {"ok": True, "memory_id": "2067645279842054146", "title": "林逸", "cascade": True}
    excerpt = delete_memory_ui_excerpt(json.dumps(payload), {"memory_id": payload["memory_id"]})
    assert excerpt == "林逸"
    assert "{" not in excerpt


def test_edit_chapter_ui_excerpt_line_edit_not_json():
    content = json.dumps({"ok": True, "chapter_id": "ch-1", "index": 1}, ensure_ascii=False)
    excerpt = edit_chapter_ui_excerpt(
        content,
        {"chapter_id": "ch-1", "line_start": 5, "title": "码农的平凡日常"},
    )
    assert excerpt == "《码农的平凡日常》 · 第5行"
    assert "{" not in excerpt


def test_write_chapter_ui_excerpt_uses_json_title():
    content = json.dumps(
        {"ok": True, "chapter_id": "ch-1", "index": 2, "title": "奶茶店"},
        ensure_ascii=False,
    )
    excerpt = write_chapter_ui_excerpt(content, {})
    assert excerpt == "《奶茶店》"


def test_delete_chapter_ui_excerpt_json_ack():
    content = json.dumps({"ok": True, "deleted": ["ch-1"]}, ensure_ascii=False)
    excerpt = delete_chapter_ui_excerpt(content, {"title": "第一章"})
    assert excerpt == "《第一章》"


def test_reorder_chapters_ui_excerpt_count():
    content = json.dumps({"ok": True, "count": 3, "order": []}, ensure_ascii=False)
    assert reorder_chapters_ui_excerpt(content, {}) == "3 章"


def test_create_memory_ui_excerpt_parses_head_line():
    content = "CreateMemory OK · title='力量体系' · scope='世界观' · memory_id=m1\n{}"
    assert create_memory_ui_excerpt(content, {"scope": "世界观"}) == "力量体系"


def test_skill_ui_excerpt_json():
    content = json.dumps({"skill": "brainstorm", "loaded": True}, ensure_ascii=False)
    assert skill_ui_excerpt(content, {}) == "brainstorm"


def test_resolve_tool_result_title_never_returns_json():
    content = json.dumps({"ok": True, "chapter_id": "x", "index": 1}, ensure_ascii=False)
    title = resolve_tool_result_title("EditChapter", content, {"line_start": 5})
    assert "{" not in title
    assert title == "第1章 · 第5行"
