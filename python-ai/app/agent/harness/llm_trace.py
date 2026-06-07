"""Trace LLM request/response for agent debugging (UTF-8 file + logger)."""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from langchain_core.messages import BaseMessage, SystemMessage

from app.config import settings
from app.core.llm_content import extract_llm_text

logger = logging.getLogger("app.agent.harness.llm_trace")

_FILE_LOGGER: logging.Logger | None = None
_MAX_FIELD = 12000


def _project_root() -> Path:
    env_root = (os.environ.get("PROJECT_ROOT") or "").strip()
    if env_root:
        return Path(env_root)
    return Path(__file__).resolve().parents[3]


def _trace_file_path() -> Path:
    custom = (settings.agent_llm_trace_file or "").strip()
    if custom:
        return Path(custom)
    return _project_root() / ".dev-logs" / "agent-llm-trace.log"


def _file_logger() -> logging.Logger:
    global _FILE_LOGGER
    if _FILE_LOGGER is not None:
        return _FILE_LOGGER
    path = _trace_file_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    fl = logging.getLogger("app.agent.harness.llm_trace.file")
    fl.setLevel(logging.INFO)
    fl.propagate = False
    if not fl.handlers:
        handler = logging.FileHandler(path, encoding="utf-8")
        handler.setFormatter(
            logging.Formatter("%(message)s")
        )
        fl.addHandler(handler)
    _FILE_LOGGER = fl
    return fl


def trace_enabled() -> bool:
    return bool(settings.agent_llm_trace)


def extract_cache_usage(raw: Any) -> dict[str, int]:
    """Pull MiniMax/Anthropic cache token fields from LangChain response metadata."""
    meta = raw
    if hasattr(raw, "response_metadata"):
        meta = getattr(raw, "response_metadata", None) or {}
    if hasattr(raw, "usage_metadata") and getattr(raw, "usage_metadata", None):
        meta = getattr(raw, "usage_metadata", None) or meta
    if not isinstance(meta, dict):
        return {}

    usage = meta.get("usage") if isinstance(meta.get("usage"), dict) else meta
    if not isinstance(usage, dict):
        return {}

    out: dict[str, int] = {}
    for key in (
        "input_tokens",
        "output_tokens",
        "cache_read_input_tokens",
        "cache_creation_input_tokens",
    ):
        val = usage.get(key)
        if isinstance(val, int):
            out[key] = val
    return out


def _clip(text: str, *, limit: int = _MAX_FIELD) -> str:
    raw = (text or "").strip()
    if len(raw) <= limit:
        return raw
    return raw[:limit] + f"\n…(truncated, total {len(raw)} chars)"


def _serialize_messages(messages: list[BaseMessage]) -> str:
    blocks: list[str] = []
    for msg in messages:
        role = "system" if isinstance(msg, SystemMessage) else getattr(msg, "type", "human")
        content = msg.content
        if isinstance(content, list):
            text = json.dumps(content, ensure_ascii=False, default=str)
        else:
            text = str(content or "")
        blocks.append(f"[{role}]\n{_clip(text)}")
    return "\n\n".join(blocks)


def _write_block(lines: list[str]) -> None:
    body = "\n".join(lines)
    _file_logger().info("%s", body)
    logger.info("%s", body)


def log_llm_exchange(
    *,
    phase: str,
    run_id: str = "",
    step_index: int | None = None,
    attempt: int | None = None,
    messages: list[BaseMessage] | None = None,
    raw_response: Any = None,
    parsed_summary: str = "",
    extra: dict[str, Any] | None = None,
    usage: dict[str, int] | None = None,
) -> None:
    if not trace_enabled():
        return
    ts = datetime.now(timezone.utc).isoformat()
    header = [
        "",
        "=" * 72,
        f"agent_llm_trace ts={ts} phase={phase} run_id={run_id or '-'} step_index={step_index}",
    ]
    if attempt is not None:
        header.append(f"attempt={attempt}")
    if extra:
        header.append(f"meta={json.dumps(extra, ensure_ascii=False, default=str)}")
    usage_fields = usage or extract_cache_usage(raw_response)
    if usage_fields:
        header.append(f"usage={json.dumps(usage_fields, ensure_ascii=False)}")
    header.append("-" * 72)
    lines = header
    if messages:
        lines.append("--- request ---")
        lines.append(_serialize_messages(messages))
    if raw_response is not None:
        visible = extract_llm_text(getattr(raw_response, "content", raw_response), include_thinking=False)
        thinking = extract_llm_text(getattr(raw_response, "content", raw_response), include_thinking=True)
        lines.append("--- response (visible text) ---")
        lines.append(_clip(visible))
        if thinking and thinking != visible:
            lines.append("--- response (with thinking) ---")
            lines.append(_clip(thinking))
    if parsed_summary.strip():
        lines.append("--- parsed ---")
        lines.append(parsed_summary.strip())
    lines.append("=" * 72)
    _write_block(lines)
