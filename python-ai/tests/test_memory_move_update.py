"""Memory move/update parent_id semantics."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.agent.schemas import AgentRunContext
from app.agent.tools.memory import move_memory, update_memory_content
from app.agent.tools.schemas import MoveMemoryInput, UpdateMemoryContentInput


@pytest.fixture
def ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="run-1",
        session_id="sess-1",
        message_id="msg-1",
        user_id=1,
        novel_id="novel-1",
        project={"id": "novel-1"},
    )


@pytest.mark.asyncio
async def test_update_memory_parent_id_guard_mismatch(ctx: AgentRunContext):
    existing = {
        "memory_id": "child-1",
        "parent_id": "parent-a",
        "scope": "world",
        "node_kind": "leaf",
    }
    with patch("app.agent.tools.memory.get_memory_node", new=AsyncMock(return_value=(existing, ""))):
        inp = UpdateMemoryContentInput(memory_id="child-1", parent_id="parent-b", content="new body")
        result = await update_memory_content(ctx, inp)
    assert result.is_error
    assert "parent_id" in (result.content or "").lower()


@pytest.mark.asyncio
async def test_update_memory_parent_id_guard_ok(ctx: AgentRunContext):
    existing = {
        "memory_id": "child-1",
        "parent_id": "parent-a",
        "scope": "world",
        "node_kind": "leaf",
        "style": {"layout": "prose"},
    }
    updated = {**existing, "content": "new body"}
    with patch("app.agent.tools.memory.get_memory_node", new=AsyncMock(return_value=(existing, ""))):
        with patch(
            "app.agent.tools.memory.update_memory_node",
            new=AsyncMock(return_value=(updated, "")),
        ):
            inp = UpdateMemoryContentInput(memory_id="child-1", parent_id="parent-a", content="new body")
            result = await update_memory_content(ctx, inp)
    assert not result.is_error


@pytest.mark.asyncio
async def test_move_memory_sort_only_preserves_parent(ctx: AgentRunContext):
    existing = {"memory_id": "child-1", "parent_id": "parent-a", "scope": "world"}
    moved = {**existing, "sort_order": 2}
    move_mock = AsyncMock(return_value=(moved, ""))
    with patch("app.agent.tools.memory.get_memory_node", new=AsyncMock(return_value=(existing, ""))):
        with patch("app.agent.tools.memory.move_memory_node", new=move_mock):
            inp = MoveMemoryInput(memory_id="child-1", sort_order=2)
            result = await move_memory(ctx, inp)
    assert not result.is_error
    move_mock.assert_awaited_once()
    body = move_mock.await_args.args[2]
    assert body["sort_order"] == 2
    assert body["parent_id"] == "parent-a"


@pytest.mark.asyncio
async def test_move_memory_explicit_root(ctx: AgentRunContext):
    moved = {"memory_id": "child-1", "parent_id": None, "scope": "world", "sort_order": 0}
    move_mock = AsyncMock(return_value=(moved, ""))
    with patch("app.agent.tools.memory.move_memory_node", new=move_mock):
        inp = MoveMemoryInput(memory_id="child-1", parent_id=None)
        result = await move_memory(ctx, inp)
    assert not result.is_error
    body = move_mock.await_args.args[2]
    assert body["parent_id"] is None
