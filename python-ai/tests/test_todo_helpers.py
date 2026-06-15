"""TodoWrite helper tests."""

import pytest
from langchain_core.messages import HumanMessage

from app.agent.harness.loop_support import (
    RunLoopState,
    block_run_end_for_open_todos,
    build_todo_reminder_message,
)
from app.agent.harness.transcript import AgentTranscript
from app.agent.schemas import AgentRunContext
from app.agent.tools.interaction import todo_write
from app.agent.tools.schemas import TodoWriteInput
from app.agent.tools.todo_helpers import format_todos_for_model


def test_format_todos_for_model_lists_statuses():
    text = format_todos_for_model(
        [
            {"id": "a", "content": "大纲", "status": "completed"},
            {"id": "b", "content": "写章", "status": "in_progress"},
        ]
    )
    assert "2 items" in text
    assert "[completed] a" in text
    assert "[in_progress] b" in text


def test_build_todo_reminder_message_when_open_items():
    msg = build_todo_reminder_message(
        {
            "todos": [
                {"id": "a", "content": "写第三章", "status": "in_progress"},
                {"id": "b", "content": "审查", "status": "pending"},
            ]
        }
    )
    assert msg is not None
    assert "TodoWrite" in msg
    assert "写第三章" in msg


def test_block_run_end_for_open_todos_once():
    ctx = AgentRunContext(
        session_id="s1",
        run_id="r1",
        message_id="m1",
        user_id=1,
        novel_id="n1",
        context_patch={
            "todos": [{"id": "x", "content": "未完成", "status": "pending"}],
        },
    )
    state = RunLoopState(
        ctx=ctx,
        transcript=AgentTranscript(),
        think_content="",
        sequence=0,
    )
    messages: list = []

    def _refresh(msgs, c, _t):
        _ = msgs, c

    assert block_run_end_for_open_todos(state, messages, refresh_context=_refresh) is True
    assert len(messages) == 1
    assert isinstance(messages[0], HumanMessage)
    assert block_run_end_for_open_todos(state, messages, refresh_context=_refresh) is False


@pytest.mark.asyncio
async def test_todo_write_content_includes_summary():
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
        ],
        merge=False,
    )
    result = await todo_write(ctx, inp)
    assert "Todos updated" in (result.content or "")
    assert "todo-1" in (result.content or "")
    assert "in_progress" in (result.content or "")
