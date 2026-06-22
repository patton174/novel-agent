"""In-run interaction wait registry for query loop pause/resume."""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Any

from app.config import settings


@dataclass
class _SessionEntry:
    session: RunSession
    created_at: float


_sessions: dict[str, _SessionEntry] = {}


class RunSession:
    def __init__(self, run_id: str) -> None:
        self.run_id = run_id
        self._event = asyncio.Event()
        self._interaction: dict[str, Any] | None = None
        self._resume_gate = asyncio.Event()
        self._resume_gate.set()
        self.aborted = False
        self.paused = False

    def is_paused(self) -> bool:
        return self.paused

    def pause(self) -> None:
        self.paused = True
        self._resume_gate.clear()

    def resume(self) -> None:
        self.paused = False
        self._resume_gate.set()

    async def await_running(self) -> None:
        if self.aborted:
            return
        await self._resume_gate.wait()

    async def wait_interaction(self) -> dict[str, Any]:
        self._event.clear()
        self._interaction = None
        await self._event.wait()
        return dict(self._interaction or {})

    def submit_interaction(self, payload: dict[str, Any]) -> bool:
        if self.aborted:
            return False
        self._interaction = dict(payload)
        self._event.set()
        return True

    def abort(self) -> None:
        self.aborted = True
        self.paused = False
        self._resume_gate.set()
        self._interaction = {}
        self._event.set()


def purge_expired_sessions(*, ttl_sec: int | None = None) -> int:
    limit = ttl_sec if ttl_sec is not None else settings.agent_run_session_ttl_sec
    now = time.monotonic()
    expired = [rid for rid, entry in _sessions.items() if now - entry.created_at > limit]
    for rid in expired:
        _sessions.pop(rid, None)
    return len(expired)


def register_run_session(run_id: str) -> RunSession:
    purge_expired_sessions()
    session = RunSession(run_id)
    _sessions[run_id] = _SessionEntry(session=session, created_at=time.monotonic())
    return session


def get_run_session(run_id: str) -> RunSession | None:
    entry = _sessions.get(run_id)
    return entry.session if entry else None


def unregister_run_session(run_id: str) -> None:
    _sessions.pop(run_id, None)


def abort_run_session(run_id: str) -> None:
    entry = _sessions.get(run_id)
    if entry is not None:
        entry.session.abort()


def pause_run_session(run_id: str) -> bool:
    entry = _sessions.get(run_id)
    if entry is None:
        return False
    entry.session.pause()
    return True


def resume_run_session(run_id: str) -> bool:
    entry = _sessions.get(run_id)
    if entry is None:
        return False
    entry.session.resume()
    return True
