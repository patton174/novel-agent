"""Token estimation, context metering, and auto-compression for agent runs."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

from app.agent.harness.plan_context import build_plan_context
from app.agent.schemas import PlanRequest
from app.config import settings

_CJK_RE = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]")
_DEFAULT_CONTEXT_WINDOW = 200_000
_COMPRESS_RATIO = 0.72
_SYSTEM_OVERHEAD_TOKENS = 2800


def context_window_tokens() -> int:
    raw = getattr(settings, "agent_context_window_tokens", None)
    try:
        val = int(raw) if raw is not None else _DEFAULT_CONTEXT_WINDOW
    except (TypeError, ValueError):
        val = _DEFAULT_CONTEXT_WINDOW
    return max(16_000, val)


def compress_threshold_tokens() -> int:
    ratio = getattr(settings, "agent_context_compress_ratio", None)
    try:
        r = float(ratio) if ratio is not None else _COMPRESS_RATIO
    except (TypeError, ValueError):
        r = _COMPRESS_RATIO
    return int(context_window_tokens() * min(max(r, 0.5), 0.95))


def estimate_text_tokens(text: str) -> int:
    """Heuristic token count (CJK-aware, no external tokenizer)."""
    raw = text or ""
    if not raw:
        return 0
    cjk = len(_CJK_RE.findall(raw))
    other = max(0, len(raw) - cjk)
    # ~1.6 chars/token for CJK, ~4 chars/token for Latin/code
    return max(1, int(cjk / 1.6 + other / 4.0))


def estimate_json_tokens(value: Any) -> int:
    if value is None:
        return 0
    if isinstance(value, str):
        return estimate_text_tokens(value)
    try:
        return estimate_text_tokens(
            json.dumps(value, ensure_ascii=False, separators=(",", ":"))
        )
    except (TypeError, ValueError):
        return estimate_text_tokens(str(value))


@dataclass
class RunUsageAccumulator:
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_creation_tokens: int = 0

    def add_llm_usage(self, usage: dict[str, int] | None) -> None:
        if not usage:
            return
        self.input_tokens += int(usage.get("input_tokens") or 0)
        self.output_tokens += int(usage.get("output_tokens") or 0)
        self.cache_read_tokens += int(usage.get("cache_read_input_tokens") or 0)
        self.cache_creation_tokens += int(usage.get("cache_creation_input_tokens") or 0)

    def as_dict(self) -> dict[str, int]:
        return {
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "cache_read_tokens": self.cache_read_tokens,
            "cache_creation_tokens": self.cache_creation_tokens,
        }


def measure_plan_prompt(req: PlanRequest) -> dict[str, Any]:
    """Estimate planner prompt size by section."""
    ctx_json = build_plan_context(req)
    sections: dict[str, int] = {}
    for key, value in ctx_json.items():
        sections[key] = estimate_json_tokens(value)
    prompt_tokens = sum(sections.values()) + _SYSTEM_OVERHEAD_TOKENS
    limit = context_window_tokens()
    percent = round(min(100.0, prompt_tokens / limit * 100.0), 1)
    return {
        "prompt_tokens": prompt_tokens,
        "context_limit": limit,
        "context_percent": percent,
        "sections": sections,
    }


def should_compress_context(prompt_tokens: int) -> bool:
    return prompt_tokens >= compress_threshold_tokens()


def build_context_usage_payload(
    *,
    prompt_measure: dict[str, Any],
    run_usage: RunUsageAccumulator,
    turn: int,
    compressed: bool = False,
    compact_note: str = "",
    last_compact_mode: str = "",
) -> dict[str, Any]:
    limit = int(prompt_measure.get("context_limit") or context_window_tokens())
    prompt_tokens = int(prompt_measure.get("prompt_tokens") or 0)
    usage = run_usage.as_dict()
    percent = prompt_measure.get("context_percent", 0)
    percent_left = prompt_measure.get("percent_left")
    if percent_left is None:
        try:
            percent_left = round(max(0.0, 100.0 - float(percent)), 1)
        except (TypeError, ValueError):
            percent_left = 0.0
    thresholds = prompt_measure.get("thresholds")
    if not isinstance(thresholds, dict):
        from app.agent.context.meter import context_thresholds

        thresholds = context_thresholds()
    return {
        "turn": turn,
        "prompt_tokens": prompt_tokens,
        "context_limit": limit,
        "context_percent": percent,
        "percent_left": percent_left,
        "sections": prompt_measure.get("sections") or {},
        "source": str(prompt_measure.get("source") or "estimate"),
        "thresholds": thresholds,
        "run_input_tokens": usage["input_tokens"],
        "run_output_tokens": usage["output_tokens"],
        "cache_read_tokens": usage["cache_read_tokens"],
        "cache_creation_tokens": usage["cache_creation_tokens"],
        "compressed": compressed,
        "compact_note": compact_note,
        "last_compact_mode": last_compact_mode or "",
    }


def build_context_usage_event(
    *,
    run_id: str,
    session_id: str,
    message_id: str,
    sequence: int,
    prompt_measure: dict[str, Any],
    run_usage: RunUsageAccumulator,
    turn: int,
    compressed: bool = False,
    compact_note: str = "",
    last_compact_mode: str = "",
) -> tuple[dict[str, Any], int]:
    """Build context.usage SSE event and next sequence (CC-style metering push)."""
    from uuid import uuid4

    from app.runtime.events import build_event

    step_id = f"step_ctx_{uuid4().hex[:8]}"
    ev = build_event(
        event_type="context.usage",
        run_id=run_id,
        session_id=session_id,
        message_id=message_id,
        step_id=step_id,
        sequence=sequence,
        payload=build_context_usage_payload(
            prompt_measure=prompt_measure,
            run_usage=run_usage,
            turn=turn,
            compressed=compressed,
            compact_note=compact_note,
            last_compact_mode=last_compact_mode,
        ),
    )
    return ev, sequence + 1
