"""Structured prompt blocks (JSON slots) for modular injection."""

from __future__ import annotations

import json
from typing import Any


def coerce_text_snippet(value: Any, *, max_len: int = 2000) -> str:
    """Coerce planner/tool context values to a safe string snippet."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value[:max_len]
    if isinstance(value, (dict, list)):
        try:
            return json.dumps(value, ensure_ascii=False)[:max_len]
        except TypeError:
            return str(value)[:max_len]
    return str(value)[:max_len]


def json_block(label: str, payload: dict[str, Any]) -> str:
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    return f"{label}:\n{body}"


def join_human_blocks(*parts: str) -> str:
    return "\n\n".join(p.strip() for p in parts if p and p.strip())
