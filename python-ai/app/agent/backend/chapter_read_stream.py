"""Parse Content API chapter read NDJSON stream."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from json import JSONDecodeError
from typing import Any

import httpx


async def iter_ndjson_response(resp: httpx.Response) -> AsyncIterator[dict[str, Any]]:
    """Yield parsed JSON objects from an application/x-ndjson body."""
    buffer = ""
    async for chunk in resp.aiter_text():
        buffer += chunk
        while "\n" in buffer:
            line, buffer = buffer.split("\n", 1)
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except JSONDecodeError:
                continue
            if isinstance(obj, dict):
                yield obj
    tail = buffer.strip()
    if tail:
        try:
            obj = json.loads(tail)
        except JSONDecodeError:
            return
        if isinstance(obj, dict):
            yield obj


async def collect_chapter_read_text(events: AsyncIterator[dict[str, Any]]) -> tuple[str, dict[str, Any] | None, str | None]:
    """Accumulate delta lines; return (text, meta, error)."""
    parts: list[str] = []
    meta: dict[str, Any] | None = None
    async for obj in events:
        kind = str(obj.get("type") or "")
        if kind == "meta":
            meta = dict(obj)
        elif kind == "delta":
            parts.append(str(obj.get("text") or ""))
        elif kind == "error":
            return "", meta, str(obj.get("message") or "read stream failed")
    text = "".join(parts).strip()
    if meta is None and not text:
        return "", None, "empty chapter read stream"
    return text.rstrip() if text.endswith("\n") else text, meta, None
