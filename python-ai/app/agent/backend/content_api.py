"""Content service URL helpers (auth + internal) and Result envelope parsing."""

from __future__ import annotations

from typing import Any

from app.config import settings

AUTH_PREFIX = "/api/content/auth"
INTERNAL_PREFIX = "/internal"

USER_ID_HEADER = "X-User-Id"
INTERNAL_KEY_HEADER = "X-Internal-Service-Key"
EDIT_SOURCE_HEADER = "X-Edit-Source"


def _base_url() -> str:
    return settings.content_base_url.rstrip("/")


def content_auth_url(path: str) -> str:
    """Absolute URL under ``/api/content/auth/…`` (user-scoped tools)."""
    suffix = path if path.startswith("/") else f"/{path}"
    return f"{_base_url()}{AUTH_PREFIX}{suffix}"


def content_internal_url(path: str) -> str:
    """Absolute URL under ``/internal/…`` (service-key clients)."""
    suffix = path if path.startswith("/") else f"/{path}"
    if not suffix.startswith(INTERNAL_PREFIX):
        suffix = f"{INTERNAL_PREFIX}{suffix}"
    return f"{_base_url()}{suffix}"


def user_headers(user_id: int, *, edit_source: str | None = None) -> dict[str, str]:
    headers = {
        USER_ID_HEADER: str(user_id),
        INTERNAL_KEY_HEADER: settings.internal_service_key,
    }
    if edit_source:
        headers[EDIT_SOURCE_HEADER] = edit_source
    return headers


def internal_headers() -> dict[str, str]:
    return {INTERNAL_KEY_HEADER: settings.internal_service_key}


def unwrap_result(body: Any) -> Any:
    """Unwrap Java ``Result {code, data, success}`` or pass through legacy shapes."""
    if not isinstance(body, dict):
        return body
    if "data" in body and ("code" in body or "success" in body):
        return body.get("data")
    return body


def extract_api_error(body: Any, *, status_code: int, default: str = "request failed") -> str:
    """Pull human-readable error from Content API Result / legacy bodies."""
    data = unwrap_result(body) if body is not None else {}
    if isinstance(data, dict):
        for key in ("reason", "message", "msg", "error"):
            val = data.get(key)
            if val is not None and str(val).strip():
                return str(val).strip()
    if isinstance(body, dict):
        for key in ("reason", "message", "msg", "error"):
            val = body.get(key)
            if val is not None and str(val).strip():
                return str(val).strip()
    if status_code >= 400:
        return f"HTTP {status_code}"
    return default


def unwrap_story_memory(body: Any) -> dict[str, Any] | None:
    """Extract ``memory`` tree from auth story-memory GET/patch/delete payloads."""
    data = unwrap_result(body)
    if not isinstance(data, dict):
        return None
    memory = data.get("memory")
    if isinstance(memory, dict):
        return memory
    # Session/novel GET may return scopes directly when memory key absent.
    if any(k in data for k in ("novel", "world", "characters", "chapters", "background")):
        return data
    return None
