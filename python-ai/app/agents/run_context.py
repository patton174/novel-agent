"""Per-run context for tools (chapter text, mode)."""

from __future__ import annotations

from contextvars import ContextVar
from typing import Optional

_chapter_text: ContextVar[Optional[str]] = ContextVar("chapter_text", default=None)
_mode: ContextVar[str] = ContextVar("mode", default="auto")


def bind_run_context(*, chapter_text: Optional[str], mode: str) -> None:
    _chapter_text.set(chapter_text)
    _mode.set(mode or "auto")


def get_chapter_text() -> Optional[str]:
    return _chapter_text.get()


def get_mode() -> str:
    return _mode.get()
