"""Prometheus metrics for crawl fetch / extract pipelines."""

from __future__ import annotations

try:
    from prometheus_client import Counter, Histogram
except ImportError:  # pragma: no cover
    Counter = Histogram = None  # type: ignore[misc, assignment]

_FETCH_TOTAL = None
_FETCH_DURATION = None
_STEALTH_UPGRADE = None
_CHAPTER_SAVED = None
_EXTRACT_DURATION = None


def _lazy_init() -> None:
    global _FETCH_TOTAL, _FETCH_DURATION, _STEALTH_UPGRADE, _CHAPTER_SAVED, _EXTRACT_DURATION
    if Counter is None or _FETCH_TOTAL is not None:
        return
    _FETCH_TOTAL = Counter(
        "crawl_fetch_total",
        "Crawl fetch attempts",
        ["mode", "blocked"],
    )
    _FETCH_DURATION = Histogram(
        "crawl_fetch_duration_seconds",
        "Crawl fetch latency",
        ["mode"],
        buckets=(0.1, 0.5, 1, 2, 5, 10, 30, 60),
    )
    _STEALTH_UPGRADE = Counter(
        "crawl_stealth_upgrade_total",
        "Times fetch upgraded to stealth/browser",
    )
    _CHAPTER_SAVED = Counter(
        "crawl_chapter_saved_total",
        "Chapters persisted via crawl agent",
    )
    _EXTRACT_DURATION = Histogram(
        "crawl_chapter_extract_duration_seconds",
        "Chapter extract latency",
        ["path"],
        buckets=(0.05, 0.2, 0.5, 1, 2, 5, 15, 30),
    )


def record_fetch(*, mode: str, blocked: bool, duration_sec: float, upgraded: bool = False) -> None:
    _lazy_init()
    if _FETCH_TOTAL is None:
        return
    blocked_label = "true" if blocked else "false"
    _FETCH_TOTAL.labels(mode=mode, blocked=blocked_label).inc()
    _FETCH_DURATION.labels(mode=mode).observe(max(0.0, duration_sec))
    if upgraded:
        _STEALTH_UPGRADE.inc()


def record_chapter_saved() -> None:
    _lazy_init()
    if _CHAPTER_SAVED is not None:
        _CHAPTER_SAVED.inc()


def record_extract(*, path: str, duration_sec: float) -> None:
    _lazy_init()
    if _EXTRACT_DURATION is not None:
        _EXTRACT_DURATION.labels(path=path).observe(max(0.0, duration_sec))
