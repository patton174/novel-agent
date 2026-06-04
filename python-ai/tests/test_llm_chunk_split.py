"""Tests for LlmChunkSplitter (reasoning vs visible text)."""

from app.core.llm_chunk_split import LlmChunkSplitter


def test_emit_reasoning_splits_tagged_thinking():
    splitter = LlmChunkSplitter(emit_reasoning=True)
    chunks = splitter.feed(
        "<think>inner plan</think>## 分析\n正文"
    )
    assert ("reasoning", "inner plan") in chunks
    assert any(kind == "text" and "分析" in text for kind, text in chunks)


def test_hide_reasoning_strips_thinking_tags():
    splitter = LlmChunkSplitter(emit_reasoning=False)
    chunks = splitter.feed(
        "<think>hidden</think>用户可见"
    )
    assert all(kind == "text" for kind, _ in chunks)
    joined = "".join(text for _, text in chunks)
    assert "hidden" not in joined
    assert "用户可见" in joined


def test_emit_reasoning_handles_anthropic_blocks():
    splitter = LlmChunkSplitter(emit_reasoning=True)
    chunks = splitter.feed(
        [
            {"type": "thinking", "thinking": "chain"},
            {"type": "text", "text": "answer"},
        ]
    )
    assert chunks == [("reasoning", "chain"), ("text", "answer")]


def test_hide_reasoning_skips_anthropic_thinking_blocks():
    splitter = LlmChunkSplitter(emit_reasoning=False)
    chunks = splitter.feed(
        [
            {"type": "thinking", "thinking": "chain"},
            {"type": "text", "text": "answer"},
        ]
    )
    assert chunks == [("text", "answer")]


def test_llm_stream_policy_tools():
    from app.core.llm_stream_policy import llm_policy_for_tool

    assert llm_policy_for_tool("think").emit_model_reasoning is False
    assert llm_policy_for_tool("memory_read").emit_model_reasoning is False
    assert llm_policy_for_tool("output").emit_model_reasoning is False
    assert llm_policy_for_tool("ask_user").profile == "fast"
    assert llm_policy_for_tool("choose").profile == "fast"
