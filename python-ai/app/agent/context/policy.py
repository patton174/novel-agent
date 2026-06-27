"""Context pressure policy — CC query.ts pipeline (API-adapted thresholds)."""

from __future__ import annotations

from typing import Any

from langchain_core.messages import BaseMessage

from app.agent.context.usage import context_window_tokens

# CC autoCompact.ts
_AUTOCOMPACT_BUFFER_TOKENS = 13_000
_AUTOCOMPACT_OUTPUT_RESERVE = 20_000

# CC timeBasedMCConfig defaults (disabled unless explicitly enabled)
_TIME_BASED_MC_IDLE_MINUTES = 60

_DEFAULT_MICROCOMPACT_TRIGGER = 15
_DEFAULT_MICROCOMPACT_KEEP = 5
_DEFAULT_TOOL_RESULT_BUDGET_CHARS = 200_000


def _setting_int(name: str, default: int, *, lo: int, hi: int) -> int:
    from app.config import settings

    raw = getattr(settings, name, None)
    try:
        n = int(raw) if raw is not None else default
    except (TypeError, ValueError):
        n = default
    return max(lo, min(n, hi))


def _setting_bool(name: str, default: bool = False) -> bool:
    from app.config import settings

    raw = getattr(settings, name, None)
    if raw is None:
        return default
    if isinstance(raw, bool):
        return raw
    return str(raw).strip().lower() in ("1", "true", "yes", "on")


def effective_context_window_tokens() -> int:
    """CC getEffectiveContextWindowSize — reserve headroom for compact summary output."""
    reserve = _setting_int(
        "agent_autocompact_output_reserve_tokens",
        _AUTOCOMPACT_OUTPUT_RESERVE,
        lo=4_000,
        hi=40_000,
    )
    return max(16_000, context_window_tokens() - reserve)


def autocompact_threshold_tokens() -> int:
    """CC getAutoCompactThreshold."""
    buffer = _setting_int(
        "agent_autocompact_buffer_tokens",
        _AUTOCOMPACT_BUFFER_TOKENS,
        lo=2_000,
        hi=40_000,
    )
    return max(8_000, effective_context_window_tokens() - buffer)


def tool_result_budget_limit_chars() -> int:
    return _setting_int(
        "agent_tool_result_budget_chars",
        _DEFAULT_TOOL_RESULT_BUDGET_CHARS,
        lo=20_000,
        hi=500_000,
    )


def microcompact_trigger_count() -> int:
    """CC cached-MC triggerThreshold analogue — count of compactable tool uses."""
    return _setting_int(
        "agent_microcompact_trigger_count",
        _DEFAULT_MICROCOMPACT_TRIGGER,
        lo=3,
        hi=100,
    )


def microcompact_keep_recent() -> int:
    return _setting_int(
        "agent_microcompact_keep_recent",
        _DEFAULT_MICROCOMPACT_KEEP,
        lo=1,
        hi=20,
    )


def microcompact_time_based_enabled() -> bool:
    return _setting_bool("agent_microcompact_time_based_enabled", False)


def microcompact_idle_minutes() -> int:
    return _setting_int(
        "agent_microcompact_idle_minutes",
        _TIME_BASED_MC_IDLE_MINUTES,
        lo=5,
        hi=240,
    )


def should_microcompact_messages(messages: list[BaseMessage]) -> bool:
    """
    Count-based trigger (CC cached microcompact). Not a % of context window.
    """
    from app.agent.context.compact_micro import collect_compactable_tool_ids

    ids = collect_compactable_tool_ids(messages)
    return len(ids) > microcompact_trigger_count()


def should_autocompact_context(prompt_measure: dict[str, Any] | int) -> bool:
    tokens = (
        int(prompt_measure.get("prompt_tokens") or 0)
        if isinstance(prompt_measure, dict)
        else int(prompt_measure)
    )
    return tokens >= autocompact_threshold_tokens()


def compress_threshold_tokens() -> int:
    """Backward-compatible alias — now matches CC autocompact threshold."""
    return autocompact_threshold_tokens()
