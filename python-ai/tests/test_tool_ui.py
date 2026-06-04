"""CC-aligned per-tool UI excerpts."""

from app.agent_step.tool_ui import glob_ui_excerpt, read_ui_excerpt
from app.agent_step.vfs.api_inventory import format_glob_inventory
from app.agent_step.vfs.format import add_line_numbers, FILE_UNCHANGED_STUB


def test_read_ui_excerpt_line_count():
    body = add_line_numbers("a\nb\nc\n")
    assert read_ui_excerpt(body, {"file_path": "/novel/n1/meta.json"}) == "已读取 3 行"


def test_read_ui_excerpt_unchanged():
    assert "未变更" in read_ui_excerpt(FILE_UNCHANGED_STUB, {})


def test_glob_ui_excerpt_inventory_headers():
    inv = format_glob_inventory(chapter_count=5, memory_count=2, paths=[])
    assert "5 条章节路径" in glob_ui_excerpt(inv, {})


def test_read_ui_excerpt_memory_roster():
    text = "角色库共 3 人：张三, 李四\n- 张三: 主角"
    assert "张三" in read_ui_excerpt(text, {"file_path": "/novel/n1/memory/characters.json"})
