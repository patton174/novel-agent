"""In-process tool call metrics (Prometheus export in Phase 4)."""

from __future__ import annotations

from collections import defaultdict
from threading import Lock

_lock = Lock()
_counts: dict[str, dict[str, int]] = defaultdict(lambda: {"ok": 0, "error": 0})


def reset() -> None:
    with _lock:
        _counts.clear()


def record_tool_result(tool: str, ok: bool) -> None:
    key = (tool or "unknown").strip() or "unknown"
    bucket = "ok" if ok else "error"
    with _lock:
        _counts[key][bucket] += 1


def snapshot() -> dict[str, dict[str, int]]:
    with _lock:
        return {k: dict(v) for k, v in _counts.items()}
