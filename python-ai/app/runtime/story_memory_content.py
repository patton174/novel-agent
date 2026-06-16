"""HTTP client for story memory persistence via Java content service."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.agent.backend.content_api import (
    content_auth_url,
    extract_api_error,
    unwrap_result,
    unwrap_story_memory,
    user_headers,
)

logger = logging.getLogger(__name__)

_EMPTY: dict[str, Any] = {
    "novel": {},
    "world": {},
    "characters": {},
    "chapters": {},
    "background": {},
}


def _normalize_snapshot(raw: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return {k: ({} if k in ("characters", "chapters") else {}) for k in _EMPTY}
    return {
        "novel": dict(raw.get("novel") or {}),
        "world": dict(raw.get("world") or {}),
        "characters": {
            str(k): dict(v or {})
            for k, v in (raw.get("characters") or {}).items()
        },
        "chapters": {
            str(k): dict(v or {})
            for k, v in (raw.get("chapters") or {}).items()
        },
        "background": dict(raw.get("background") or {}),
    }


def fetch_story_memory(
    user_id: int,
    *,
    novel_id: str | None = None,
    session_id: str | None = None,
) -> dict[str, Any] | None:
    if user_id <= 0:
        return None
    novel = (novel_id or "").strip()
    session = (session_id or "").strip()
    if novel:
        url = content_auth_url(f"/novels/{novel}/story-memory")
    elif session:
        url = content_auth_url(f"/sessions/{session}/story-memory")
    else:
        return None
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, headers=user_headers(user_id))
            if resp.status_code != 200:
                logger.warning(
                    "fetch story memory HTTP %s novel=%s session=%s",
                    resp.status_code,
                    novel or "-",
                    session or "-",
                )
                return None
            memory = unwrap_story_memory(resp.json())
            if isinstance(memory, dict):
                return _normalize_snapshot(memory)
    except Exception as exc:
        logger.warning(
            "fetch story memory failed novel=%s session=%s: %s",
            novel or "-",
            session or "-",
            exc,
        )
    return None


def patch_story_memory_remote(
    user_id: int,
    *,
    novel_id: str | None = None,
    session_id: str | None = None,
    scope: str,
    key: str,
    value: str,
    item_id: str | None = None,
) -> dict[str, Any]:
    novel = (novel_id or "").strip()
    session = (session_id or "").strip()
    if user_id <= 0 or (not novel and not session):
        return {"ok": False, "reason": "invalid user/novel/session"}
    if novel:
        url = content_auth_url(f"/novels/{novel}/story-memory/patch")
    else:
        url = content_auth_url(f"/sessions/{session}/story-memory/patch")
    payload: dict[str, Any] = {"scope": scope, "key": key, "value": value}
    if item_id:
        payload["item_id"] = item_id
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                url,
                json=payload,
                headers=user_headers(user_id),
            )
            body = unwrap_result(resp.json()) if resp.content else {}
            if resp.status_code >= 400:
                return {
                    "ok": False,
                    "reason": extract_api_error(body, status_code=resp.status_code, default="patch failed"),
                }
            if isinstance(body, dict) and body.get("ok") is False:
                return body
            result = {
                "ok": True,
                "scope": body.get("scope", scope),
                "key": body.get("key", key),
                "changed": body.get("changed", True),
            }
            memory = body.get("memory")
            if isinstance(memory, dict):
                result["memory"] = _normalize_snapshot(memory)
            return result
    except Exception as exc:
        logger.warning(
            "patch story memory failed novel=%s session=%s: %s",
            novel or "-",
            session or "-",
            exc,
        )
        return {"ok": False, "reason": str(exc)}


def delete_story_memory_remote(
    user_id: int,
    *,
    novel_id: str | None = None,
    session_id: str | None = None,
    scope: str,
    key: str,
    item_id: str | None = None,
) -> dict[str, Any]:
    novel = (novel_id or "").strip()
    session = (session_id or "").strip()
    if user_id <= 0 or (not novel and not session):
        return {"ok": False, "reason": "invalid user/novel/session"}
    if novel:
        url = content_auth_url(f"/novels/{novel}/story-memory/delete")
    else:
        url = content_auth_url(f"/sessions/{session}/story-memory/delete")
    payload: dict[str, Any] = {"scope": scope, "key": key}
    if item_id:
        payload["item_id"] = item_id
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                url,
                json=payload,
                headers=user_headers(user_id),
            )
            body = unwrap_result(resp.json()) if resp.content else {}
            if resp.status_code >= 400:
                return {
                    "ok": False,
                    "reason": extract_api_error(body, status_code=resp.status_code, default="delete failed"),
                }
            if isinstance(body, dict) and body.get("ok") is False:
                return body
            result = {
                "ok": True,
                "scope": body.get("scope", scope),
                "key": body.get("key", key),
                "deleted": body.get("deleted", True),
            }
            if body.get("item_id"):
                result["item_id"] = body.get("item_id")
            memory = body.get("memory")
            if isinstance(memory, dict):
                result["memory"] = _normalize_snapshot(memory)
            return result
    except Exception as exc:
        logger.warning(
            "delete story memory failed novel=%s session=%s: %s",
            novel or "-",
            session or "-",
            exc,
        )
        return {"ok": False, "reason": str(exc)}


def clear_story_memory_remote(
    user_id: int,
    *,
    novel_id: str | None = None,
    session_id: str | None = None,
    scope: str,
) -> dict[str, Any]:
    novel = (novel_id or "").strip()
    session = (session_id or "").strip()
    if user_id <= 0 or (not novel and not session):
        return {"ok": False, "reason": "invalid user/novel/session"}
    if novel:
        url = content_auth_url(f"/novels/{novel}/story-memory/clear")
    else:
        url = content_auth_url(f"/sessions/{session}/story-memory/clear")
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                url,
                json={"scope": scope},
                headers=user_headers(user_id),
            )
            body = unwrap_result(resp.json()) if resp.content else {}
            if resp.status_code >= 400:
                return {
                    "ok": False,
                    "reason": extract_api_error(body, status_code=resp.status_code, default="clear failed"),
                }
            if isinstance(body, dict) and body.get("ok") is False:
                return body
            result: dict[str, Any] = {
                "ok": True,
                "scope": body.get("scope", scope),
                "cleared": body.get("cleared", True),
            }
            memory = body.get("memory")
            if isinstance(memory, dict):
                result["memory"] = _normalize_snapshot(memory)
            return result
    except Exception as exc:
        logger.warning(
            "clear story memory failed novel=%s session=%s: %s",
            novel or "-",
            session or "-",
            exc,
        )
        return {"ok": False, "reason": str(exc)}


def fetch_memory_read_slice(
    user_id: int,
    *,
    novel_id: str | None = None,
    session_id: str | None = None,
    scope: str,
    key: str = "",
    item_id: str | None = None,
    offset: int | None = None,
    limit: int | None = None,
) -> tuple[str | None, str | None]:
    """Content API line-based memory read. Returns (numbered text, error)."""
    novel = (novel_id or "").strip()
    session = (session_id or "").strip()
    if user_id <= 0 or (not novel and not session):
        return None, "invalid user/novel/session"
    if novel:
        url = content_auth_url(f"/novels/{novel}/story-memory/read")
    else:
        url = content_auth_url(f"/sessions/{session}/story-memory/read")
    params: dict[str, str | int] = {"scope": scope}
    if key:
        params["key"] = key
    if item_id:
        params["itemId"] = item_id
    if offset is not None:
        params["offset"] = int(offset)
    if limit is not None:
        params["limit"] = int(limit)
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(
                url,
                headers=user_headers(user_id),
                params=params,
            )
            if resp.status_code == 400:
                body = resp.json() if resp.content else {}
                reason = body.get("message") or body.get("reason") or resp.text
                return None, str(reason or "memory read failed")
            if resp.status_code != 200:
                return None, f"memory read failed HTTP {resp.status_code}"
            body = unwrap_result(resp.json())
            if not isinstance(body, dict):
                return None, "invalid memory read response"
            return str(body.get("text") or ""), None
    except Exception as exc:
        logger.warning(
            "fetch memory read slice failed novel=%s session=%s: %s",
            novel or "-",
            session or "-",
            exc,
        )
        return None, str(exc)
