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
        self.aborted = False

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
        self._interaction = {}
        self._event.set()


class WorkerSliceSession:
    """Stateless worker slice: resume once, then pause instead of blocking."""

    def __init__(self, run_id: str, resume_payload: dict[str, Any] | None = None) -> None:
        self.run_id = run_id
        self._resume_payload = dict(resume_payload) if resume_payload else None
        self.aborted = False

    async def wait_interaction(self) -> dict[str, Any]:
        if self._resume_payload is not None:
            payload = self._resume_payload
            self._resume_payload = None
            return payload
        from app.agent.harness.worker.exceptions import WorkerSliceWaiting

        raise WorkerSliceWaiting()

    def submit_interaction(self, payload: dict[str, Any]) -> None:
        raise NotImplementedError("WorkerSliceSession is resume-once; use command payload")

    def abort(self) -> None:
        self.aborted = True


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
