"""Story-memory JSON envelope (v1) — validate, normalize, Read/Write."""

from __future__ import annotations

import json
from typing import Any

from app.agent_step.vfs.memory_schema import (
    FLAT_SCOPES,
    GROUP_SCOPES,
    MEMORY_DOC_VERSION,
    memory_schema_prompt_lines,
    schema_example_for_scope,
    validate_and_normalize_envelope,
)

# Re-export for tests / prompts
MEMORY_DOC_VERSION = MEMORY_DOC_VERSION
FLAT_SCOPES = FLAT_SCOPES
GROUP_SCOPES = GROUP_SCOPES


class MemoryDocumentError(ValueError):
    pass


def validate_memory_document(raw: Any, *, scope: str, entry_id: str) -> dict[str, Any]:
    """Return normalized envelope dict ready for storage."""
    scope_norm = (scope or "").strip().lower()
    if scope_norm not in FLAT_SCOPES | GROUP_SCOPES:
        raise MemoryDocumentError(f"unsupported memory scope: {scope}")

    if isinstance(raw, str):
        text = raw.strip()
        if not text:
            raise MemoryDocumentError("memory content must be non-empty JSON object")
        try:
            raw = json.loads(text)
        except json.JSONDecodeError as exc:
            raise MemoryDocumentError(
                "memory Write requires JSON object; invalid JSON"
            ) from exc

    if not isinstance(raw, dict):
        raise MemoryDocumentError("memory Write requires JSON object at root")

    version = int(raw.get("v") or raw.get("version") or 0)
    if version != MEMORY_DOC_VERSION:
        raise MemoryDocumentError(
            f'memory document must include "v": {MEMORY_DOC_VERSION}'
        )

    try:
        return validate_and_normalize_envelope(raw, scope=scope_norm, entry_id=entry_id)
    except ValueError as exc:
        raise MemoryDocumentError(str(exc)) from exc


def envelope_to_storage_fields(
    envelope: dict[str, Any], *, scope: str
) -> dict[str, str]:
    """Map normalized envelope → story-memory API key/value fields."""
    scope_norm = (scope or "").strip().lower()
    data = envelope.get("data")
    if not isinstance(data, dict):
        raise MemoryDocumentError("invalid envelope data")

    out: dict[str, str] = {}
    for key, value in data.items():
        if value is None:
            continue
        text = str(value).strip()
        if not text:
            continue
        storage_key = "正文" if key == "body" and scope_norm in FLAT_SCOPES else str(key)
        out[storage_key] = text

    summary = str(envelope.get("summary") or "").strip()
    if summary:
        out.setdefault("摘要", summary)

    if not out:
        raise MemoryDocumentError("data produced no storage fields")
    return out


def format_memory_document_for_read(
    envelope: dict[str, Any], *, scope: str, entry_id: str
) -> str:
    """Agent Read：元信息 + 可分页的 Markdown 正文（非整段 JSON）。"""
    lines = [
        "# 记忆文档 v1",
        f"- scope: {scope}",
        f"- id: {entry_id}",
    ]
    title = str(envelope.get("title") or entry_id).strip()
    if title:
        lines.append(f"- title: {title}")
    summary = str(envelope.get("summary") or "").strip()
    if summary:
        lines.append(f"- summary: {summary}")
    lines.append("")
    data = envelope.get("data") if isinstance(envelope.get("data"), dict) else {}
    body = ""
    for key in ("body", "正文", "content"):
        raw = data.get(key)
        if isinstance(raw, str) and raw.strip():
            body = raw.strip()
            break
    if body:
        lines.append("---")
        lines.append("")
        lines.append(body)
        return "\n".join(lines)
    parts: list[str] = ["\n".join(lines)]
    for key, value in (data or {}).items():
        if key in ("body", "正文", "content"):
            continue
        text = str(value or "").strip()
        if not text:
            continue
        parts.append(f"## {key}\n\n{text}")
    if len(parts) > 1:
        return "\n\n".join(parts).strip()
    return parts[0] + json.dumps(
        {
            "v": envelope.get("v", MEMORY_DOC_VERSION),
            "title": title or entry_id,
            "summary": summary,
            "data": data,
        },
        ensure_ascii=False,
        indent=2,
    )


def legacy_rows_to_envelope(
    scope: str, entry_id: str, rows: dict[str, str]
) -> dict[str, Any]:
    """Upgrade flat API rows to v1 envelope for Read output."""
    data: dict[str, Any] = {}
    summary = ""
    body_parts: list[str] = []
    for key, value in (rows or {}).items():
        text = str(value or "").strip()
        if not text:
            continue
        if key in ("摘要", "summary"):
            summary = text
            continue
        if key == "人物卡" and text.startswith("{"):
            try:
                parsed = json.loads(text)
                if isinstance(parsed, dict):
                    for ck, cv in parsed.items():
                        data[str(ck)] = str(cv)
                else:
                    data["人物卡"] = text
            except json.JSONDecodeError:
                data["人物卡"] = text
            continue
        if key in ("正文", "body", "content"):
            body_parts.append(text)
            continue
        data[key] = text
    if body_parts:
        data["body"] = "\n\n".join(body_parts)
    title = str(rows.get("title") or entry_id).strip() or entry_id
    if scope == "character" and data.get("身份"):
        title = str(data["身份"])[:40] or entry_id
    return {
        "v": MEMORY_DOC_VERSION,
        "title": title,
        "summary": summary,
        "data": data,
    }
