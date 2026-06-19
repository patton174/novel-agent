"""Single validation gate for tool execution (batch + incremental stream)."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel

from app.agent.backend.memory_catalog import format_scope_root_ids_hint
from app.agent.schemas import AgentRunContext
from app.agent.tools.registry import find_tool_by_name

logger = logging.getLogger(__name__)

# LLM 常误传 `"content": null`；对 patch 类工具去掉 null 键，避免「字段存在但无有效更新」。
# CreateMemory 的 parent_id 除外：模型常显式传 null 占位，strip 后只剩 title 会误伤校验。
_STRIP_NULL_OPTIONAL_KEYS = frozenset(
    {
        "UpdateMemoryFields",
        "UpdateMemoryContent",
        "UpdateMemoryMeta",
        "EditChapter",
    }
)

_CREATE_MEMORY_STRIP_NULL_KEYS = frozenset(
    {"content", "node_kind", "style", "meta", "sort_order"}
)


def _strip_null_optionals(tool: str, raw: dict[str, Any]) -> dict[str, Any]:
    if (tool or "").strip() not in _STRIP_NULL_OPTIONAL_KEYS:
        return raw
    return {k: v for k, v in raw.items() if v is not None}


def _strip_create_memory_nulls(raw: dict[str, Any]) -> dict[str, Any]:
    """Drop null optionals but keep parent_id key until validation runs."""
    out: dict[str, Any] = {}
    for key, value in (raw or {}).items():
        if value is not None:
            out[key] = value
        elif key not in _CREATE_MEMORY_STRIP_NULL_KEYS and key not in ("parent_id",):
            continue
        elif key == "parent_id":
            out[key] = value
    return out


def _log_invalid_tool_input(tool: str, raw: dict[str, Any], err: str) -> None:
    preview: dict[str, Any] = {}
    for key, value in (raw or {}).items():
        if key in ("content", "new_content") and isinstance(value, str) and len(value) > 160:
            preview[key] = f"{value[:160]}…({len(value)} chars)"
        else:
            preview[key] = value
    logger.warning(
        "tool input validation failed tool=%s keys=%s input=%s error=%s",
        tool,
        sorted((raw or {}).keys()),
        preview,
        err,
    )


@dataclass(frozen=True)
class PreparedToolInput:
    tool: str
    canonical: dict[str, Any]
    parsed: BaseModel


def _finalize_create_memory_input(raw: dict[str, Any]) -> dict[str, Any]:
    """Remove null parent_id so Pydantic sees omitted field, not null."""
    out = dict(raw or {})
    if not str(out.get("parent_id") or "").strip():
        out.pop("parent_id", None)
    return out


def _enrich_create_memory_child_error(
    ctx: AgentRunContext,
    raw: dict[str, Any],
    err: str | None,
) -> str:
    if raw.get("node_type") != "child":
        return err or "invalid input"
    if str(raw.get("parent_id") or "").strip():
        return err or "invalid input"
    hint = format_scope_root_ids_hint(ctx)
    if not hint:
        return err or "invalid input"
    base = err or "node_type=child requires parent_id"
    return f"{base}\n{hint}"


def apply_tool_input_policy(
    tool: str,
    raw: dict[str, Any],
    ctx: AgentRunContext | None = None,
) -> dict[str, Any]:
    """Product rules before schema parse (WriteChapter stream-only, etc.)."""
    out = dict(raw or {})
    name = (tool or "").strip()
    if name == "WriteChapter":
        inline = str(out.get("content") or "").strip()
        if inline:
            logger.info(
                "WriteChapter: stripping %d chars of inline content (stream-only)",
                len(inline),
            )
            out["content"] = ""
    if name == "CreateMemory" and ctx is not None:
        out = _strip_create_memory_nulls(out)
        out = _finalize_create_memory_input(out)
    else:
        out = _strip_null_optionals(name, out)
    return out


def prepare_tool_input(
    tool_name: str,
    raw_input: dict[str, Any],
    ctx: AgentRunContext,
) -> tuple[PreparedToolInput | None, str | None]:
    """Parse + validate tool args. Same path for run_tool_use and tool.use.ready."""
    name = (tool_name or "").strip()
    tool = find_tool_by_name(name)
    if tool is None:
        return None, f"unknown tool: {name}"

    patched = apply_tool_input_policy(name, raw_input, ctx)
    parsed, err = tool.parse_input(patched)
    if parsed is None:
        if name == "CreateMemory":
            err = _enrich_create_memory_child_error(ctx, patched, err)
        _log_invalid_tool_input(name, patched, err or "invalid input")
        return None, err or "invalid input"

    if tool.validate_input:
        vr = tool.validate_input(ctx, parsed)
        if not vr.ok:
            return None, vr.message

    canonical = parsed.model_dump(mode="json")
    return PreparedToolInput(tool=name, canonical=canonical, parsed=parsed), None
