"""活跃模型配置缓存（embedding/crawl/image）。失败→平台默认+报警。"""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx

from app.agent.backend.content_api import content_internal_url, internal_headers, unwrap_result
from app.config import settings

logger = logging.getLogger(__name__)

TTL_SEC = 60
ALERT_DEDUP_SEC = 60


class ModelRegistry:
    """进程内缓存。单 uvicorn worker 下全局一致。"""

    def __init__(self) -> None:
        self._cache: dict[str, dict[str, Any]] = {}
        self._fetched_at: dict[str, float] = {}
        self._alerted: dict[str, float] = {}

    def get(self, model_type: str) -> dict[str, Any]:
        now = time.monotonic()
        cached_at = self._fetched_at.get(model_type, 0)
        if model_type in self._cache and now - cached_at < TTL_SEC:
            return self._cache[model_type]

        cfg = self._fetch(model_type, default=False)
        if cfg is not None:
            self._cache[model_type] = cfg
            self._fetched_at[model_type] = now
            return cfg

        default_cfg = self._fetch(model_type, default=True)
        if default_cfg is not None:
            self._cache[model_type] = default_cfg
            self._fetched_at[model_type] = now
            self._alert(
                model_type,
                "active missing, fallback default",
                severity="warn",
                fallback_code=default_cfg.get("code"),
            )
            return default_cfg

        self._alert(model_type, "no active nor default model", severity="error", fallback_code=None)
        raise RuntimeError(f"无可用 {model_type} 模型（活跃与默认均缺失）")

    def try_get(self, model_type: str) -> dict[str, Any] | None:
        try:
            return self.get(model_type)
        except RuntimeError:
            return None

    def _fetch(self, model_type: str, *, default: bool) -> dict[str, Any] | None:
        params: dict[str, str] = {"type": model_type}
        if default:
            params["default"] = "true"
        url = content_internal_url("/model/active")
        try:
            resp = httpx.get(url, params=params, headers=internal_headers(), timeout=5.0)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            body = resp.json()
            data = unwrap_result(body)
            if isinstance(data, dict) and data:
                return self._normalize_config(data)
            return None
        except Exception as e:
            logger.warning("model fetch failed type=%s default=%s err=%s", model_type, default, e)
            return None

    @staticmethod
    def _normalize_config(cfg: dict[str, Any]) -> dict[str, Any]:
        out = dict(cfg)
        if "model" not in out and out.get("model_name"):
            out["model"] = out["model_name"]
        return out

    def _alert(self, model_type: str, reason: str, *, severity: str, fallback_code: str | None) -> None:
        key = f"{model_type}:{reason}"
        now = time.monotonic()
        last = self._alerted.get(key, 0)
        if now - last < ALERT_DEDUP_SEC:
            return
        self._alerted[key] = now
        self._post_alert(model_type, reason, severity=severity, fallback_code=fallback_code)

    def _post_alert(
        self, model_type: str, reason: str, *, severity: str, fallback_code: str | None
    ) -> None:
        try:
            url = content_internal_url("/alert/model")
            httpx.post(
                url,
                json={
                    "model_type": model_type,
                    "reason": reason,
                    "fallback_model_code": fallback_code,
                    "severity": severity,
                },
                headers=internal_headers(),
                timeout=3.0,
            )
        except Exception as e:
            logger.warning("model alert post failed: %s", e)


model_registry = ModelRegistry()
