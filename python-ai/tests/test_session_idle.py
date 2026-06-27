"""Tests for session idle gap (CC time-based microcompact)."""

from datetime import datetime, timedelta, timezone

from app.agent.context.session_idle import session_idle_minutes_from_history


def test_idle_minutes_from_assistant_created_at_millis():
    two_hours_ago = int((datetime.now(timezone.utc) - timedelta(hours=2)).timestamp() * 1000)
    history = [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "hello", "created_at": two_hours_ago},
    ]
    minutes = session_idle_minutes_from_history(history)
    assert 115 <= minutes <= 125


def test_idle_zero_without_timestamp():
    history = [{"role": "assistant", "content": "hello"}]
    assert session_idle_minutes_from_history(history) == 0.0


def test_idle_uses_last_assistant_even_if_user_follows():
    two_hours_ago = int((datetime.now(timezone.utc) - timedelta(hours=2)).timestamp() * 1000)
    history = [
        {"role": "assistant", "content": "old reply", "created_at": two_hours_ago},
        {"role": "user", "content": "follow up"},
    ]
    minutes = session_idle_minutes_from_history(history)
    assert 115 <= minutes <= 125
