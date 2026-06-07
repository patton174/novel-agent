"""Logging bootstrap with UTF-8 console on Windows."""

from __future__ import annotations

import logging
import sys

from app.config import settings
from app.core.trace_middleware import TraceIdFilter


def configure_stdio_utf8() -> None:
    """Avoid mojibake when logging Chinese to Windows consoles."""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            try:
                reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass


def setup_logging() -> None:
    configure_stdio_utf8()
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
    if any(
        isinstance(h, logging.StreamHandler) and getattr(h.stream, "name", "") == "<stderr>"
        for h in root_logger.handlers
    ):
        return
    handler = logging.StreamHandler(sys.stderr)
    handler.addFilter(TraceIdFilter())
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s trace_id=%(trace_id)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    root_logger.addHandler(handler)
