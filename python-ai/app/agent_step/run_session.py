"""In-run interaction wait registry for query loop pause/resume."""

from __future__ import annotations

import asyncio
from typing import Any

_sessions: dict[str, RunSession] = {}


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


def register_run_session(run_id: str) -> RunSession:
    session = RunSession(run_id)
    _sessions[run_id] = session
    return session


def get_run_session(run_id: str) -> RunSession | None:
    return _sessions.get(run_id)


def unregister_run_session(run_id: str) -> None:
    _sessions.pop(run_id, None)


def abort_run_session(run_id: str) -> None:
    session = _sessions.get(run_id)
    if session is not None:
        session.abort()
