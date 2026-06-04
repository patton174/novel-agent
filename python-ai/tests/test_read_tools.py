"""Read tool pagination and annotation helpers."""

from app.agent_step.vfs.read_tools import (
    annotate_read_output,
    coalesce_read_limit,
    slice_includes_memory_body,
)


def test_coalesce_raises_small_first_page_limit():
    assert coalesce_read_limit(1, 10, kind="memory") >= 120
    assert coalesce_read_limit(None, 10, kind="chapter") >= 150
    assert coalesce_read_limit(5, 10, kind="memory") == 10


def test_annotate_warns_header_only_memory_slice():
    header = "# 记忆文档 v1\n- scope: 角色库\n\n[记忆共 20 行，本次 5 行；续读 offset=6 limit=…]"
    out = annotate_read_output(header, kind="memory")
    assert "正文在 `---` 之后" in out


def test_slice_includes_memory_body():
    assert slice_includes_memory_body("---\n\n正文") is True
    assert slice_includes_memory_body("# 记忆文档 v1") is False
