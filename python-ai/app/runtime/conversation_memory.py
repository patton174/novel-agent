"""In-process conversation memory keyed by session_id (dev / single-worker)."""

from __future__ import annotations

from collections import deque
from typing import Literal

from app.runtime.story_memory import get_story_memory

Role = Literal["user", "assistant"]
_MAX_TURNS = 12
_store: dict[str, deque[tuple[Role, str]]] = {}
def get_turns(session_id: str) -> list[tuple[Role, str]]:
    if not session_id:
        return []
    return list(_store.get(session_id, ()))


def append_turn(session_id: str, user: str, assistant: str) -> None:
    if not session_id or not user.strip():
        return
    queue = _store.setdefault(session_id, deque(maxlen=_MAX_TURNS * 2))
    queue.append(("user", user.strip()))
    if assistant.strip():
        queue.append(("assistant", assistant.strip()))


def clear_session(session_id: str) -> None:
    _store.pop(session_id, None)


def get_story_snapshot(session_id: str) -> dict:
    return get_story_memory(session_id)
