"""Context pressure policy — when to microcompact / autocompact (CC-aligned thresholds)."""

from __future__ import annotations

from typing import Any

from app.agent_step.context_usage import (
    compress_threshold_tokens,
    context_window_tokens,
)
from app.config import settings

_DEFAULT_MICROCOMPACT_RATIO = 0.55


def microcompact_threshold_tokens() -> int:
    """Start clearing old tool results when estimated context reaches this size."""
    ratio = getattr(settings, "agent_microcompact_ratio", None)
    try:
        r = float(ratio) if ratio is not None else _DEFAULT_MICROCOMPACT_RATIO
    except (TypeError, ValueError):
        r = _DEFAULT_MICROCOMPACT_RATIO
    return int(context_window_tokens() * min(max(r, 0.35), 0.9))


def microcompact_keep_recent() -> int:
    raw = getattr(settings, "agent_microcompact_keep_recent", None)
    try:
        n = int(raw) if raw is not None else 5
    except (TypeError, ValueError):
        n = 5
    return max(1, min(n, 20))


def should_microcompact_context(prompt_measure: dict[str, Any] | int) -> bool:
    tokens = (
        int(prompt_measure.get("prompt_tokens") or 0)
        if isinstance(prompt_measure, dict)
        else int(prompt_measure)
    )
    return tokens >= microcompact_threshold_tokens()


def should_autocompact_context(prompt_measure: dict[str, Any] | int) -> bool:
    """Full LLM summary compact (P2) — same gate as legacy transcript compress for now."""
    tokens = (
        int(prompt_measure.get("prompt_tokens") or 0)
        if isinstance(prompt_measure, dict)
        else int(prompt_measure)
    )
    return tokens >= compress_threshold_tokens()
