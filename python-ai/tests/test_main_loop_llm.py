"""Main loop bind_tools streaming."""

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
async def test_stream_bind_tools_plain_preamble_before_tools_is_discarded():
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

    assert "narration.delta" not in types
    assert "message.delta" not in types


@pytest.mark.asyncio
async def test_stream_bind_tools_markdown_before_tools_without_prefix_is_discarded():
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

    assert "narration.delta" not in types
    assert "message.delta" not in types


@pytest.mark.asyncio
async def test_stream_bind_tools_plain_final_turn_without_delivery_prefix_is_silent():
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

    assert "message.delta" not in types
    assert "message.completed" not in types
    assert "narration.delta" not in types


@pytest.mark.asyncio
async def test_stream_bind_tools_plain_final_turn_without_prefix_emits_nothing():
    chunk = AIMessageChunk(content="好的，已完成。")
    llm = MagicMock()
    llm.astream = lambda _messages: _async_iter([chunk])

    types: list[str] = []
    async for item in stream_bind_tools_turn(
        llm, [], ctx=_ctx(), planning_step_id="step_p", sequence=0
    ):
        if not isinstance(item, AIMessage):
            types.append(str(item.get("type")))

    assert "message.delta" not in types
    assert "message.completed" not in types
    assert "narration.delta" not in types


@pytest.mark.asyncio
async def test_stream_bind_tools_visible_text_after_tool_start_without_prefix_discarded():
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

    assert "narration.delta" not in types
    assert "message.delta" not in types


@pytest.mark.asyncio
async def test_stream_bind_tools_orchestration_prefix_strips_and_narrates():
    chunk1 = AIMessageChunk(content="[编排]\n\n")
    chunk2 = AIMessageChunk(content="- **Glob** 列章\n")
    chunk3 = AIMessageChunk(
        content="",
        tool_call_chunks=[{"name": "Glob", "args": "{}", "id": "c1", "index": 0}],
    )
    llm = MagicMock()
    llm.astream = lambda _messages: _async_iter([chunk1, chunk2, chunk3])

    types: list[str] = []
    narration_text = ""
    async for item in stream_bind_tools_turn(
        llm, [], ctx=_ctx(), planning_step_id="step_p", sequence=0
    ):
        if not isinstance(item, AIMessage):
            types.append(str(item.get("type")))
            if item.get("type") == "narration.delta":
                narration_text += str(item.get("payload", {}).get("text") or "")

    assert "narration.delta" in types
    assert "message.delta" not in types
    assert "[编排]" not in narration_text
    assert "Glob" in narration_text


@pytest.mark.asyncio
async def test_stream_bind_tools_delivery_prefix_streams_message():
    chunk1 = AIMessageChunk(content="[交付]\n\n")
    chunk2 = AIMessageChunk(content="你好！**欢迎**回来。")
    llm = MagicMock()
    llm.astream = lambda _messages: _async_iter([chunk1, chunk2])

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
    assert "narration.delta" not in types
    assert "[交付]" not in message_text
    assert "欢迎" in message_text


@pytest.mark.asyncio
async def test_stream_bind_tools_plain_preamble_before_tool_signal_is_discarded():
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

    assert "narration.delta" not in types
    assert "message.delta" not in types


@pytest.mark.asyncio
async def test_stream_bind_tools_terminal_without_prefix_emits_nothing():
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

    assert "narration.delta" not in types
    assert "message.delta" not in types
    assert "message.completed" not in types


@pytest.mark.asyncio
async def test_stream_bind_tools_inline_delivery_prefix_after_preamble():
    chunk1 = AIMessageChunk(content="第 5 步完成。\n\n[交付]\n\n")
    chunk2 = AIMessageChunk(content="# 报告\n\n正文")
    llm = MagicMock()
    llm.astream = lambda _messages: _async_iter([chunk1, chunk2])

    types: list[str] = []
    message_text = ""
    async for item in stream_bind_tools_turn(
        llm, [], ctx=_ctx(), planning_step_id="step_p", sequence=0
    ):
        if not isinstance(item, AIMessage):
            types.append(str(item.get("type")))
            if item.get("type") == "message.delta":
                message_text += str(item.get("payload", {}).get("text") or "")

    assert "narration.delta" not in types
    assert "message.delta" in types
    assert "第 5 步" not in message_text
    assert "报告" in message_text


@pytest.mark.asyncio
async def test_stream_bind_tools_orchestration_final_turn_stays_narration_only():
    chunk1 = AIMessageChunk(content="[编排]\n\n")
    chunk2 = AIMessageChunk(content="这是最终汇报，不应再进正文。")
    llm = MagicMock()
    llm.astream = lambda _messages: _async_iter([chunk1, chunk2])

    types: list[str] = []
    async for item in stream_bind_tools_turn(
        llm, [], ctx=_ctx(), planning_step_id="step_p", sequence=0
    ):
        if not isinstance(item, AIMessage):
            types.append(str(item.get("type")))

    assert "narration.delta" in types
    assert "message.delta" not in types
    assert "message.completed" not in types


async def _async_iter(items):
    for item in items:
        yield item
