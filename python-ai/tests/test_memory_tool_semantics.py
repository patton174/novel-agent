"""Memory tree tools — schema and style defaults."""

from __future__ import annotations

import pytest

from app.agent.backend.memory_style_presets import default_style_for_scope
from app.agent.tools.schemas import CreateMemoryInput, ReadMemoryInput


def test_read_memory_requires_memory_id():
    with pytest.raises(Exception):
        ReadMemoryInput()
    ok = ReadMemoryInput(memory_id="abc-123")
    assert ok.memory_id == "abc-123"


def test_create_memory_style_default_root():
    style = default_style_for_scope("世界观", node_kind="both", is_root=True)
    assert style.get("layout") == "hero"
    inp = CreateMemoryInput(node_type="root", title="世界观", node_kind="both")
    assert inp.title == "世界观"
    assert inp.parent_id is None
    assert inp.node_type == "root"


def test_create_memory_root_no_parent_id():
    inp = CreateMemoryInput(node_type="root", title="角色库")
    assert inp.parent_id is None


def test_create_memory_child_requires_parent_id():
    with pytest.raises(Exception):
        CreateMemoryInput(node_type="child", title="林逸")
    ok = CreateMemoryInput(
        node_type="child",
        title="林逸",
        parent_id="root-mem-uuid",
    )
    assert ok.parent_id == "root-mem-uuid"


def test_create_memory_root_rejects_parent_id():
    with pytest.raises(Exception):
        CreateMemoryInput(node_type="root", title="世界观", parent_id="some-id")


def test_create_memory_requires_node_type():
    with pytest.raises(Exception):
        CreateMemoryInput(title="世界观")


def test_create_memory_coerces_string_style():
    inp = CreateMemoryInput(
        node_type="child",
        title="身份谜团",
        parent_id="root-mem-uuid",
        style="accordion",
    )
    assert inp.style == {"layout": "accordion"}
