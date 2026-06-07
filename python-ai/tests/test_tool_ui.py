"""CC-aligned per-tool UI excerpts."""

from app.agent.backend.format import FILE_UNCHANGED_STUB, add_line_numbers
from app.agent.harness.tool_ui import glob_ui_excerpt, read_ui_excerpt


def test_read_ui_excerpt_line_count():
    body = add_line_numbers("a\nb\nc\n")
    assert read_ui_excerpt(body, {"file_path": "/novel/n1/meta.json"}) == "已读取 3 行"


def test_read_ui_excerpt_unchanged():
    assert "未变更" in read_ui_excerpt(FILE_UNCHANGED_STUB, {})


def test_glob_ui_excerpt_list_chapters_json():
    inv = '{"chapters": [{"chapter_id": "a", "title": "第一章"}, {"chapter_id": "b", "title": "第二章"}]}'
    excerpt = glob_ui_excerpt(inv, {})
    assert "第一章" in excerpt


def test_read_ui_excerpt_memory_roster():
    text = "角色库共 3 人：张三, 李四\n- 张三: 主角"
    assert "张三" in read_ui_excerpt(text, {"file_path": "/novel/n1/memory/characters.json"})
