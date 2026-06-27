"""Backward-compatible re-exports — 实现已迁至 app.services.cover.spec 包。"""

from app.services.cover.spec import *  # noqa: F403
from app.services.cover.spec import __all__ as _all

__all__ = list(_all)
