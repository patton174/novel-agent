"""Extract visible LLM text from LangChain / Anthropic / OpenAI message content."""

from __future__ import annotations

from typing import Any

from app.runtime.text_sanitize import strip_think_markup

_TEXT_TYPES = frozenset({"text", "output_text"})
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
