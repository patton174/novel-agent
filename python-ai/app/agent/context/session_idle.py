"""Session idle gap for CC time-based microcompact (API: history timestamps from PG)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def _parse_turn_timestamp(raw: Any) -> datetime | None:
    if raw is None:
        return None
    try:
        if isinstance(raw, (int, float)):
            val = float(raw)
            if val <= 0:
                return None
            # PG/Java uses epoch millis; seconds if small.
            if val > 1e12:
                val /= 1000.0
            return datetime.fromtimestamp(val, tz=timezone.utc)
        text = str(raw).strip()
        if not text:
            return None
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except (TypeError, ValueError, OSError):
        return None


def session_idle_minutes_from_history(history: list[Any] | None) -> float:
    """
    Minutes since the last assistant turn (CC ``evaluateTimeBasedTrigger`` input).

    Uses ``created_at`` / ``createdAt`` / ``timestamp`` on history rows when present.
    """
    last_ts: datetime | None = None
    for turn in reversed(history or []):
        if not isinstance(turn, dict):
            continue
        if str(turn.get("role") or "").strip().lower() != "assistant":
            continue
        last_ts = _parse_turn_timestamp(
            turn.get("created_at") or turn.get("createdAt") or turn.get("timestamp")
        )
        break
    if last_ts is None:
        return 0.0
    now = datetime.now(timezone.utc)
    if last_ts.tzinfo is None:
        last_ts = last_ts.replace(tzinfo=timezone.utc)
    return max(0.0, (now - last_ts).total_seconds() / 60.0)
