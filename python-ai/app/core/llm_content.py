"""Extract visible LLM text from LangChain / Anthropic / OpenAI message content."""

from __future__ import annotations

from typing import Any

from langchain_core.messages import AIMessage

from app.runtime.text_sanitize import strip_think_markup

_TEXT_TYPES = frozenset({"text", "output_text"})
_THINKING_BLOCK_TYPES = frozenset({"thinking", "redacted_thinking"})
_SKIP_TYPES = frozenset({"thinking", "redacted_thinking", "tool_use", "tool_result"})


def extract_llm_text(raw: Any, *, include_thinking: bool = False) -> str:
    """
    Normalize assistant message content to plain text.

    Anthropic/MiniMax returns content blocks: thinking + text.
    For JSON planning, only text blocks are used unless include_thinking=True.
    """
    if raw is None:
        return ""
    if isinstance(raw, str):
        if include_thinking:
            return raw
        return strip_think_markup(raw)
    if isinstance(raw, list):
        parts: list[str] = []
        for item in raw:
            if isinstance(item, str):
                parts.append(item)
                continue
            if not isinstance(item, dict):
                continue
            block_type = str(item.get("type") or "").lower()
            if block_type in _SKIP_TYPES and not include_thinking:
                continue
            if block_type in _TEXT_TYPES or (include_thinking and block_type == "thinking"):
                text = item.get("text")
                if text is None and block_type == "thinking":
                    text = item.get("thinking")
                if text:
                    parts.append(str(text))
            elif "text" in item and block_type not in _SKIP_TYPES:
                parts.append(str(item.get("text") or ""))
        joined = "".join(parts)
        return joined if include_thinking else strip_think_markup(joined)
    return str(raw)


def extract_thinking_text(raw: Any) -> str:
    """Native thinking blocks only (excludes visible text blocks)."""
    if raw is None:
        return ""
    if isinstance(raw, str):
        return strip_think_markup(raw) if "<think" in raw.lower() else ""
    if isinstance(raw, list):
        parts: list[str] = []
        for item in raw:
            if not isinstance(item, dict):
                continue
            block_type = str(item.get("type") or "").lower()
            if block_type not in _THINKING_BLOCK_TYPES:
                continue
            text = item.get("thinking") or item.get("text")
            if text:
                parts.append(str(text))
        return "".join(parts)
    return ""


def strip_thinking_blocks(raw: Any) -> Any:
    """Remove native thinking blocks for API history (CC filterTrailingThinking)."""
    if raw is None:
        return ""
    if isinstance(raw, str):
        return strip_think_markup(raw)
    if isinstance(raw, list):
        kept: list[Any] = []
        for item in raw:
            if isinstance(item, str):
                text = strip_think_markup(item)
                if text:
                    kept.append(text)
                continue
            if not isinstance(item, dict):
                continue
            if str(item.get("type") or "").lower() in _THINKING_BLOCK_TYPES:
                continue
            kept.append(item)
        return kept if kept else ""
    return raw


def sanitize_ai_message_for_history(msg: AIMessage) -> AIMessage:
    """Strip thinking from assistant turns before LangChain message history append."""
    content = strip_thinking_blocks(getattr(msg, "content", ""))
    return AIMessage(
        content=content,
        tool_calls=list(getattr(msg, "tool_calls", None) or []),
        additional_kwargs=getattr(msg, "additional_kwargs", None) or {},
        response_metadata=getattr(msg, "response_metadata", None) or {},
        id=getattr(msg, "id", None),
    )
