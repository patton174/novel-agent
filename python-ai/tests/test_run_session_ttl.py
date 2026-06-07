"""T3.6 — expired RunSession entries are purged."""

from __future__ import annotations

import time

from app.agent.harness import run_session as rs


def setup_function():
    rs._sessions.clear()


def teardown_function():
    rs._sessions.clear()


def test_purge_expired_sessions():
    session = rs.RunSession("old-run")
    rs._sessions["old-run"] = rs._SessionEntry(
        session=session,
        created_at=time.monotonic() - 7200,
    )
    rs._sessions["fresh-run"] = rs._SessionEntry(
        session=rs.RunSession("fresh-run"),
        created_at=time.monotonic(),
    )
    removed = rs.purge_expired_sessions(ttl_sec=3600)
    assert removed == 1
    assert "old-run" not in rs._sessions
    assert "fresh-run" in rs._sessions
