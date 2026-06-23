"""Main loop bind_tools streaming — visible text forwards as message.delta."""

from unittest.mock import MagicMock

import pytest
from langchain_core.messages import AIMessage, AIMessageChunk

from app.agent.harness.main_loop_llm import stream_bind_tools_turn
from app.agent.schemas import AgentRunContext


def _ctx() -> AgentRunContext:
    return AgentRunContext(
        run_id="run_s",
        session_id="session_s",
        message_id="message_s",
        user_id=1,
        user_message="hi",
    )


@pytest.mark.asyncio
async def test_stream_bind_tools_accumulates_tool_calls():
    chunk1 = AIMessageChunk(content="", tool_call_chunks=[{"name": "output", "args": "", "id": "c1", "index": 0}])
    chunk2 = AIMessageChunk(
        content="",
        tool_call_chunks=[{"name": None, "args": '{"hint":"x"}', "id": None, "index": 0}],
    )
    llm = MagicMock()
    llm.astream = lambda _messages: _async_iter([chunk1, chunk2])

    types: list[str] = []
    final: AIMessage | None = None
    async for item in stream_bind_tools_turn(
        llm, [], ctx=_ctx(), planning_step_id="step_p", sequence=0
    ):
        if isinstance(item, AIMessage):
            final = item
        else:
            types.append(str(item.get("type")))

    assert final is not None
    assert final.tool_calls
    assert final.tool_calls[0]["name"] == "output"


@pytest.mark.asyncio
async def test_stream_bind_tools_emits_message_before_tool_use_ready():
    chunk1 = AIMessageChunk(content="先列章节。")
    chunk2 = AIMessageChunk(
        content="",
        tool_call_chunks=[{"name": "ListChapters", "args": "{}", "id": "c1", "index": 0}],
    )
    llm = MagicMock()
    llm.astream = lambda _messages: _async_iter([chunk1, chunk2])

    types: list[str] = []
    async for item in stream_bind_tools_turn(
        llm, [], ctx=_ctx(), planning_step_id="step_p", sequence=0
    ):
        if not isinstance(item, AIMessage):
            types.append(str(item.get("type")))

    assert "message.delta" in types
    assert "narration.delta" not in types
    assert "tool.use.ready" in types
    ready_idx = types.index("tool.use.ready")
    msg_idxs = [i for i, t in enumerate(types) if t == "message.delta"]
    assert msg_idxs
    assert min(msg_idxs) < ready_idx


@pytest.mark.asyncio
async def test_stream_bind_tools_plain_preamble_before_tools_forwards_message():
    chunk1 = AIMessageChunk(content="我来帮你了解这本书的现状。")
    chunk2 = AIMessageChunk(
        content="",
        tool_call_chunks=[{"name": "Glob", "args": "{}", "id": "c1", "index": 0}],
    )
    llm = MagicMock()
    llm.astream = lambda _messages: _async_iter([chunk1, chunk2])

    types: list[str] = []
    async for item in stream_bind_tools_turn(
        llm, [], ctx=_ctx(), planning_step_id="step_p", sequence=0
    ):
        if not isinstance(item, AIMessage):
            types.append(str(item.get("type")))

    assert "message.delta" in types
    assert "narration.delta" not in types
    assert "reasoning.delta" not in types


@pytest.mark.asyncio
async def test_stream_bind_tools_markdown_before_tools_forwards_message():
    chunk1 = AIMessageChunk(content="将执行：\n- **Glob** 列章\n- **Read** 读正文")
    chunk2 = AIMessageChunk(
        content="",
        tool_call_chunks=[{"name": "Glob", "args": "{}", "id": "c1", "index": 0}],
    )
    llm = MagicMock()
    llm.astream = lambda _messages: _async_iter([chunk1, chunk2])

    types: list[str] = []
    async for item in stream_bind_tools_turn(
        llm, [], ctx=_ctx(), planning_step_id="step_p", sequence=0
    ):
        if not isinstance(item, AIMessage):
            types.append(str(item.get("type")))

    assert "message.delta" in types
    assert "narration.delta" not in types


@pytest.mark.asyncio
async def test_stream_bind_tools_plain_final_turn_emits_message_and_completed():
    chunk1 = AIMessageChunk(content="你好！👋\n\n")
    chunk2 = AIMessageChunk(content="欢迎回来！这是一部 **网游爽文**。")
    llm = MagicMock()
    llm.astream = lambda _messages: _async_iter([chunk1, chunk2])

    types: list[str] = []
    async for item in stream_bind_tools_turn(
        llm, [], ctx=_ctx(), planning_step_id="step_p", sequence=0
    ):
        if not isinstance(item, AIMessage):
            types.append(str(item.get("type")))

    assert "message.delta" in types
    assert "message.completed" in types
    assert "narration.delta" not in types
    assert "reasoning.delta" not in types


@pytest.mark.asyncio
async def test_stream_bind_tools_terminal_without_tools_emits_message():
    chunk1 = AIMessageChunk(content="你好，")
    chunk2 = AIMessageChunk(content="欢迎回来。")
    llm = MagicMock()
    llm.astream = lambda _messages: _async_iter([chunk1, chunk2])

    types: list[str] = []
    async for item in stream_bind_tools_turn(
        llm, [], ctx=_ctx(), planning_step_id="step_p", sequence=0
    ):
        if not isinstance(item, AIMessage):
            types.append(str(item.get("type")))

    assert "message.delta" in types
    assert "message.completed" in types
    assert "narration.delta" not in types


@pytest.mark.asyncio
async def test_stream_bind_tools_visible_text_after_tool_start_forwards_message():
    chunk1 = AIMessageChunk(
        content="",
        tool_call_chunks=[{"name": "memory_read", "args": "{}", "id": "c1", "index": 0}],
    )
    chunk2 = AIMessageChunk(content="先说明一下。")
    llm = MagicMock()
    llm.astream = lambda _messages: _async_iter([chunk1, chunk2])

    types: list[str] = []
    async for item in stream_bind_tools_turn(
        llm, [], ctx=_ctx(), planning_step_id="step_p", sequence=0
    ):
        if not isinstance(item, AIMessage):
            types.append(str(item.get("type")))

    assert "message.delta" in types
    assert "narration.delta" not in types


@pytest.mark.asyncio
async def test_stream_bind_tools_orchestration_prefix_passes_through_in_message():
    chunk1 = AIMessageChunk(content="[编排]\n\n")
    chunk2 = AIMessageChunk(content="- **Glob** 列章\n")
    chunk3 = AIMessageChunk(
        content="",
        tool_call_chunks=[{"name": "Glob", "args": "{}", "id": "c1", "index": 0}],
    )
    llm = MagicMock()
    llm.astream = lambda _messages: _async_iter([chunk1, chunk2, chunk3])

    types: list[str] = []
    message_text = ""
    async for item in stream_bind_tools_turn(
        llm, [], ctx=_ctx(), planning_step_id="step_p", sequence=0
    ):
        if not isinstance(item, AIMessage):
            types.append(str(item.get("type")))
            if item.get("type") == "message.delta":
                message_text += str(item.get("payload", {}).get("text") or "")

    assert "message.delta" in types
    assert "narration.delta" not in types
    assert "[编排]" in message_text
    assert "Glob" in message_text


@pytest.mark.asyncio
async def test_stream_bind_tools_visible_text_passes_through_unchanged():
    chunk1 = AIMessageChunk(content="你好！**欢迎**回来。")
    llm = MagicMock()
    llm.astream = lambda _messages: _async_iter([chunk1])

    types: list[str] = []
    message_text = ""
    async for item in stream_bind_tools_turn(
        llm, [], ctx=_ctx(), planning_step_id="step_p", sequence=0
    ):
        if not isinstance(item, AIMessage):
            types.append(str(item.get("type")))
            if item.get("type") == "message.delta":
                message_text += str(item.get("payload", {}).get("text") or "")

    assert "message.delta" in types
    assert "message.completed" in types
    assert "欢迎" in message_text


@pytest.mark.asyncio
async def test_stream_bind_tools_plain_preamble_before_tool_signal_forwards_message():
    chunk1 = AIMessageChunk(content="将先 ")
    chunk2 = AIMessageChunk(content="Glob 列章。")
    chunk3 = AIMessageChunk(
        content="",
        tool_call_chunks=[{"name": "Glob", "args": "{}", "id": "c1", "index": 0}],
    )
    llm = MagicMock()
    llm.astream = lambda _messages: _async_iter([chunk1, chunk2, chunk3])

    types: list[str] = []
    async for item in stream_bind_tools_turn(
        llm, [], ctx=_ctx(), planning_step_id="step_p", sequence=0
    ):
        if not isinstance(item, AIMessage):
            types.append(str(item.get("type")))

    assert "message.delta" in types
    assert "narration.delta" not in types


@pytest.mark.asyncio
async def test_stream_bind_tools_orchestration_final_turn_emits_message():
    chunk1 = AIMessageChunk(content="[编排]\n\n")
    chunk2 = AIMessageChunk(content="这是最终汇报。")
    llm = MagicMock()
    llm.astream = lambda _messages: _async_iter([chunk1, chunk2])

    types: list[str] = []
    async for item in stream_bind_tools_turn(
        llm, [], ctx=_ctx(), planning_step_id="step_p", sequence=0
    ):
        if not isinstance(item, AIMessage):
            types.append(str(item.get("type")))

    assert "message.delta" in types
    assert "message.completed" in types
    assert "narration.delta" not in types


@pytest.mark.asyncio
async def test_stream_bind_tools_with_tools_emits_completed_delivery_false_before_tools():
    chunk1 = AIMessageChunk(content="我来帮你了解这本书的现状。")
    chunk2 = AIMessageChunk(
        content="",
        tool_call_chunks=[{"name": "Glob", "args": "{}", "id": "c1", "index": 0}],
    )
    llm = MagicMock()
    llm.astream = lambda _messages: _async_iter([chunk1, chunk2])

    events: list[dict] = []
    async for item in stream_bind_tools_turn(
        llm, [], ctx=_ctx(), planning_step_id="step_p", sequence=0
    ):
        if not isinstance(item, AIMessage):
            events.append(item)

    types = [str(e.get("type")) for e in events]
    completed = [e for e in events if e.get("type") == "message.completed"]
    assert completed
    assert completed[0].get("payload", {}).get("delivery") is False
    tool_idx = next(i for i, t in enumerate(types) if t.startswith("tool."))
    completed_idx = types.index("message.completed")
    assert completed_idx < tool_idx


@pytest.mark.asyncio
async def test_stream_bind_tools_terminal_emits_completed_delivery_true():
    chunk1 = AIMessageChunk(content="你好，")
    chunk2 = AIMessageChunk(content="欢迎回来。")
    llm = MagicMock()
    llm.astream = lambda _messages: _async_iter([chunk1, chunk2])

    events: list[dict] = []
    async for item in stream_bind_tools_turn(
        llm, [], ctx=_ctx(), planning_step_id="step_p", sequence=0
    ):
        if not isinstance(item, AIMessage):
            events.append(item)

    completed = [e for e in events if e.get("type") == "message.completed"]
    assert len(completed) == 1
    assert completed[0].get("payload", {}).get("delivery") is True


async def _async_iter(items):
    for item in items:
        yield item
