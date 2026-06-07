"""Prometheus metrics exposure for FastAPI."""

from __future__ import annotations

from fastapi import FastAPI


def setup_metrics(app: FastAPI) -> None:
    try:
        from prometheus_fastapi_instrumentator import Instrumentator
    except ImportError:
        return
    Instrumentator(
        should_group_status_codes=True,
        should_ignore_untemplated=True,
        excluded_handlers={"/metrics", "/actuator/health"},
    ).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
