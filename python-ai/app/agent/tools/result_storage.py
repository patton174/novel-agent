"""Tool result size limits (CC ``toolResultStorage`` / ``processToolResultBlock``)."""

from __future__ import annotations

import os
from pathlib import Path

MAX_DEFAULT_CHARS = 80_000
EMPTY_TOOL_RESULT_MARKER = "(tool completed with no output)"


def truncate_tool_result(text: str, *, max_chars: int = MAX_DEFAULT_CHARS) -> str:
    body = (text or "").strip()
    if not body:
        return EMPTY_TOOL_RESULT_MARKER
    if len(body) <= max_chars:
        return body
    keep = max_chars - 200
    persisted = _maybe_persist_overflow(body, max_chars=max_chars)
    if persisted:
        return persisted
    return (
        body[:keep]
        + f"\n\n… [{len(body) - keep} chars truncated; total {len(body)} chars. "
        "Read fewer items per turn or use offset/limit on ReadChapter.]"
    )


def _maybe_persist_overflow(body: str, *, max_chars: int) -> str | None:
    """Optional disk spill (CC ``persistToolResult``) when AGENT_TOOL_RESULT_PERSIST=1."""
    if os.environ.get("AGENT_TOOL_RESULT_PERSIST", "").strip() not in ("1", "true", "yes"):
        return None
    if len(body) <= max_chars:
        return None
    root = Path(os.environ.get("AGENT_TOOL_RESULT_DIR", ".dev-logs/tool-results"))
    try:
        root.mkdir(parents=True, exist_ok=True)
        path = root / f"overflow_{len(body)}_{hash(body) & 0xFFFFFFFF:08x}.txt"
        path.write_text(body, encoding="utf-8")
        preview = body[:400].replace("\n", " ")
        return (
            f"<persisted-output>\n"
            f"Tool result saved to: {path.resolve()}\n"
            f"Original size: {len(body)} chars\n"
            f"Preview: {preview}…\n"
            f"</persisted-output>"
        )
    except OSError:
        return None
