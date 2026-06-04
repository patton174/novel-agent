"""TodoWrite schema: id + content are required (CC — no server-side todo invention)."""

import pytest

from app.agent_step.schemas import AgentRunContext
from app.agent_step.tools.cc import _todo_call
from app.agent_step.tools.cc.schemas import TodoWriteInput
from app.agent_step.tools.run_tool_use import run_tool_use


@pytest.mark.asyncio
async def test_todo_write_requires_id_on_each_item():
    ctx = AgentRunContext(
        session_id="s1",
        run_id="run-1",
        message_id="msg-1",
        user_id=1,
        novel_id="n1",
    )
    result = await run_tool_use(
        "TodoWrite",
        {
            "todos": [{"content": "创建大纲", "status": "in_progress"}],
            "merge": False,
        },
        ctx,
    )
    assert result.is_error
    assert "tool_use_error" in (result.content or "")
    assert "id" in (result.content or "").lower()


@pytest.mark.asyncio
async def test_todo_write_persists_when_model_supplies_ids():
    ctx = AgentRunContext(
        session_id="s1",
        run_id="run-1",
        message_id="msg-1",
        user_id=1,
        novel_id="n1",
    )
    inp = TodoWriteInput(
        todos=[
            {"id": "todo-1", "content": "创建大纲", "status": "in_progress"},
            {"id": "todo-2", "content": "写第一章", "status": "pending"},
        ],
        merge=False,
    )
    result = await _todo_call(ctx, inp)
    todos = (result.context_patch or {}).get("todos")
    assert isinstance(todos, list)
    assert len(todos) == 2
    assert {t["id"] for t in todos} == {"todo-1", "todo-2"}
