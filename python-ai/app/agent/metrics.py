"""In-process tool call metrics (Prometheus export in Phase 4).

AGENT_REFACTOR_PLAN P0.1: counts now carry ``error_code``, ``is_final`` and
``attempt`` so that the **final failure rate** (北极星指标 §0.1) is not polluted
by silent retries. ``record_tool_result`` stays backward compatible:
``record_tool_result(tool, ok)`` keeps working; new kwargs are optional.

Bucket semantics per tool:
  - ``ok``          : final successful calls
  - ``error``       : final failed calls (== final failure numerator)
  - ``retries``     : non-final attempts (silent retries / intermediate)
  - ``by_code``     : final-error count keyed by ``error_code``
  - ``attempts``    : attempt-number histogram (str(attempt) -> count)
"""

from __future__ import annotations

from collections import defaultdict
from threading import Lock


def _new_bucket() -> dict:
    return {
        "ok": 0,
        "error": 0,
        "retries": 0,
        "by_code": defaultdict(int),
        "attempts": defaultdict(int),
    }


_lock = Lock()
_counts: dict[str, dict] = defaultdict(_new_bucket)


def reset() -> None:
    with _lock:
        _counts.clear()


def record_tool_result(
    tool: str,
    ok: bool,
    *,
    error_code: str | None = None,
    is_final: bool = True,
    attempt: int = 1,
) -> None:
    """Record a single tool execution outcome.

    Args:
        tool: tool name.
        ok: whether this execution succeeded.
        error_code: structured failure code (only meaningful when ``not ok``).
        is_final: ``False`` for intermediate/silent retries — these do **not**
            count toward the failure rate, only the ``retries`` histogram.
        attempt: 1-based attempt number for the attempt histogram.
    """
    key = (tool or "unknown").strip() or "unknown"
    with _lock:
        bucket = _counts[key]
        try:
            bucket["attempts"][str(int(attempt))] += 1
        except (TypeError, ValueError):
            bucket["attempts"]["1"] += 1
        if not is_final:
            bucket["retries"] += 1
            return
        if ok:
            bucket["ok"] += 1
        else:
            bucket["error"] += 1
            code = (error_code or "UNKNOWN").strip() or "UNKNOWN"
            bucket["by_code"][code] += 1


def snapshot() -> dict[str, dict]:
    """Plain-dict snapshot (defaultdicts materialized)."""
    with _lock:
        out: dict[str, dict] = {}
        for tool, bucket in _counts.items():
            out[tool] = {
                "ok": bucket["ok"],
                "error": bucket["error"],
                "retries": bucket["retries"],
                "by_code": dict(bucket["by_code"]),
                "attempts": dict(bucket["attempts"]),
            }
        return out


def final_failure_rate(tool: str | None = None) -> float:
    """Final failure rate = final errors / (final ok + final errors).

    When ``tool`` is ``None`` it aggregates across all tools. Returns ``0.0``
    when there are no final outcomes yet.
    """
    with _lock:
        buckets = (
            [_counts[tool]] if tool is not None and tool in _counts else list(_counts.values())
        )
        if tool is not None and tool not in _counts:
            return 0.0
        ok = sum(b["ok"] for b in buckets)
        err = sum(b["error"] for b in buckets)
    total = ok + err
    return (err / total) if total else 0.0
