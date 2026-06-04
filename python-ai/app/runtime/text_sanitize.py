"""Strip model thinking tags; only keep visible text outside think blocks."""

from __future__ import annotations

import re

_THINKING_OPEN = "<think>"
_THINKING_CLOSE = "</think>"
_THINK_TAG = "think"
_LEGACY_THINK_OPEN = f"<{_THINK_TAG}>"
_LEGACY_THINK_CLOSE = f"</{_THINK_TAG}>"

_THINKING_BLOCK = re.compile(
    r"<think>[\s\S]*?</think>",
    re.IGNORECASE,
)
_LEGACY_THINK_BLOCK = re.compile(
    rf"<{_THINK_TAG}>[\s\S]*?</{_THINK_TAG}>",
    re.IGNORECASE,
)
# MiniMax / 主循环 tool 语法不得进入章节正文流
_TOOL_CALL_BLOCK = re.compile(
    r"<minimax:tool_call>[\s\S]*?</minimax:tool_call>",
    re.IGNORECASE,
)
_TOOL_INVOKE_LINE = re.compile(
    r"^\s*<invoke\s+name=[\"'][^\"']+[\"'][^>]*>\s*$",
    re.IGNORECASE | re.MULTILINE,
)
_TOOL_CALLING_CHATTER = re.compile(
    r"正在调用\s+chapter_\w+",
    re.IGNORECASE,
)


def strip_think_markup(text: str) -> str:
    """Remove complete think blocks and stray tags; keep only outside text."""
    cleaned = _THINKING_BLOCK.sub("", text or "")
    cleaned = _LEGACY_THINK_BLOCK.sub("", cleaned)
    return (
        cleaned.replace(_THINKING_OPEN, "")
        .replace(_THINKING_CLOSE, "")
        .replace(_LEGACY_THINK_OPEN, "")
        .replace(_LEGACY_THINK_CLOSE, "")
    )


def strip_line_leading_fullwidth_indent(text: str) -> str:
    """Remove leading ideographic spaces; UI applies paragraph indent via CSS."""
    if not text:
        return ""
    return "\n".join(re.sub(r"^[\u3000]+", "", line) for line in text.split("\n"))


def strip_tool_call_markup(text: str) -> str:
    """Remove model tool_use XML/chatter leaked into chapter prose streams."""
    cleaned = _TOOL_CALL_BLOCK.sub("", text or "")
    cleaned = _TOOL_INVOKE_LINE.sub("", cleaned)
    cleaned = _TOOL_CALLING_CHATTER.sub("", cleaned)
    return cleaned.strip()


def extract_visible_text(raw: str) -> str:
    """
    Visible body text only — never surface content inside think tags.

    Used for message正文 and structured think Markdown (tags outside blocks only).
    """
    text = strip_think_markup(raw)
    text = strip_tool_call_markup(text)
    text = re.sub(r"^```[\w]*\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def has_unclosed_think(text: str) -> bool:
    lowered = (text or "").lower()
    for open_tag, close_tag in (
        (_THINKING_OPEN.lower(), _THINKING_CLOSE.lower()),
        (_LEGACY_THINK_OPEN.lower(), _LEGACY_THINK_CLOSE.lower()),
    ):
        if open_tag in lowered and close_tag not in lowered:
            return True
    return False
