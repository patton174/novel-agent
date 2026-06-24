"""ModelRegistry 单测。"""

from __future__ import annotations

import time
from unittest.mock import patch

from app.core.model_registry import ModelRegistry


def _mk_reg() -> ModelRegistry:
    reg = ModelRegistry()
    reg._cache.clear()
    reg._fetched_at.clear()
    reg._alerted.clear()
    return reg


def test_get_returns_cached_within_ttl():
    reg = _mk_reg()
    cfg = {"provider": "openai", "model_name": "x", "model": "x"}
    reg._cache["embedding"] = cfg
    reg._fetched_at["embedding"] = time.monotonic()
    assert reg.get("embedding") is cfg


def test_get_fetches_active_when_expired():
    reg = _mk_reg()
    reg._cache["crawl"] = {"old": True}
    reg._fetched_at["crawl"] = time.monotonic() - 120
    fetched = {"provider": "openai", "model_name": "new", "model": "new"}
    with patch.object(reg, "_fetch", return_value=fetched) as m:
        assert reg.get("crawl") == fetched
        m.assert_called_once_with("crawl", default=False)


def test_get_falls_back_to_platform_default_and_alerts():
    reg = _mk_reg()
    default_cfg = {"provider": "openai", "model_name": "def", "model": "def", "code": "def-1"}
    calls: list[tuple[str, bool]] = []

    def fake_fetch(model_type, default):
        calls.append((model_type, default))
        return default_cfg if default else None

    with patch.object(reg, "_fetch", side_effect=fake_fetch):
        with patch.object(reg, "_post_alert") as alert:
            assert reg.get("image") == default_cfg
            alert.assert_called_once()
            assert alert.call_args.kwargs["severity"] == "warn"


def test_get_raises_when_default_also_missing():
    reg = _mk_reg()
    with patch.object(reg, "_fetch", return_value=None):
        with patch.object(reg, "_post_alert") as alert:
            try:
                reg.get("embedding")
                assert False, "应抛异常"
            except RuntimeError:
                pass
            alert.assert_called_once()
            assert alert.call_args.kwargs["severity"] == "error"


def test_alert_dedup_within_60s():
    reg = _mk_reg()
    with patch.object(reg, "_fetch", return_value=None):
        with patch.object(reg, "_post_alert") as alert:
            for _ in range(5):
                try:
                    reg.get("embedding")
                except RuntimeError:
                    pass
            assert alert.call_count == 1
