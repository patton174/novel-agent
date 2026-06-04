"""MiniMax Anthropic prompt cache helpers (passive + active cache_control)."""

from __future__ import annotations

from langchain_core.messages import SystemMessage

from app.config import settings


def prompt_cache_enabled() -> bool:
    if not settings.llm_prompt_cache:
        return False
    protocol = str(settings.llm_protocol or "anthropic").lower()
    return protocol == "anthropic"


def cached_system_content(text: str) -> str | list[dict]:
    """Return Anthropic system blocks with ephemeral cache_control when enabled."""
    body = (text or "").strip()
    if not body or not prompt_cache_enabled():
        return body
    return [
        {
            "type": "text",
            "text": body,
            "cache_control": {"type": "ephemeral"},
        }
    ]


def cached_system_message(text: str) -> SystemMessage:
    return SystemMessage(content=cached_system_content(text))
