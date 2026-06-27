"""Backward-compatible re-exports — 实现已迁至 app.services.cover 包。"""

from app.services.cover import *  # noqa: F403
from app.services.cover import __all__ as _all

__all__ = list(_all)
