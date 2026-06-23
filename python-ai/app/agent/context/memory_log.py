"""Append-only memory operation log for planner context (dev: expose history, no autofill)."""

from __future__ import annotations

from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from app.agent.schemas import AgentRunContext

from app.agent.backend.memory_catalog import extract_scope_root_ids

_MAX_OPS = 24
_MAX_READS_SESSION = 16


def append_memory_read_record(
    context_patch: dict[str, Any] | None,
    *,
    memory_id: str,
    scope: str | None = None,
    title: str | None = None,
) -> dict[str, Any]:
    """Track parallel ReadMemory in-session; last_memory_read alone drops earlier reads."""
    patch = dict(context_patch or {})
    entry: dict[str, Any] = {
        "ok": True,
        "memory_id": str(memory_id or "").strip(),
    }
    if scope:
        entry["scope"] = str(scope)
    title_text = str(title or "").strip()
    if title_text:
        entry["title"] = title_text[:120]
    reads = patch.get("memory_reads_session")
    if not isinstance(reads, list):
        reads = []
    mid = entry["memory_id"]
    reads = [
        row
        for row in reads
        if not (isinstance(row, dict) and str(row.get("memory_id") or "") == mid)
    ]
    reads.append(entry)
    patch["memory_reads_session"] = reads[-_MAX_READS_SESSION:]
    patch["last_memory_read"] = entry
    label = title_text or (mid[:8] + "…" if mid else "memory")
    return append_memory_op_log(
        patch,
        tool="ReadMemory",
        ok=True,
        summary=f"已读 {label}",
        memory_id=mid,
        scope=scope or "",
    )


def append_memory_op_log(
    context_patch: dict[str, Any] | None,
    *,
    tool: str,
    ok: bool,
    summary: str,
    **fields: Any,
) -> dict[str, Any]:
    patch = dict(context_patch or {})
    log = patch.get("memory_ops_log")
    if not isinstance(log, list):
        log = []
    entry: dict[str, Any] = {
        "tool": tool,
        "ok": ok,
        "summary": str(summary or "")[:240],
    }
    for key, value in fields.items():
        if value is None or value == "":
            continue
        entry[key] = value
    patch["memory_ops_log"] = (list(log) + [entry])[-_MAX_OPS:]
    return patch


def update_character_roster(
    context_patch: dict[str, Any] | None,
    *,
    item_ids: list[str] | None = None,
    removed: str | None = None,
) -> dict[str, Any]:
    patch = dict(context_patch or {})
    roster = patch.get("character_roster")
    if not isinstance(roster, list):
        roster = []
    if item_ids is not None:
        patch["character_roster"] = [str(x) for x in item_ids]
        return patch
    if removed:
        name = str(removed).strip()
        patch["character_roster"] = [x for x in roster if str(x) != name]
    return patch


def memory_ops_for_plan_json(log: Any, *, max_items: int = 12) -> list[dict[str, Any]]:
    """Compact op log entries for planner JSON context."""
    if not isinstance(log, list) or not log:
        return []
    entries: list[dict[str, Any]] = []
    for item in log[-max_items:]:
        if not isinstance(item, dict):
            continue
        row: dict[str, Any] = {
            "tool": str(item.get("tool") or ""),
            "ok": bool(item.get("ok")),
        }
        for key in ("scope", "item_id", "key", "title"):
            val = item.get(key)
            if val:
                row[key] = val
        note = str(item.get("reason") or item.get("summary") or "").strip()
        if note:
            row["note"] = note[:120]
        entries.append(row)
    return entries


def build_memory_write_batch_ack(
    ctx: "AgentRunContext",
    *,
    min_entries: int = 1,
) -> str | None:
    """Human-readable batch summary so the model does not re-create existing roots."""
    patch = ctx.context_patch if isinstance(ctx.context_patch, dict) else {}
    log = patch.get("memory_ops_log")
    if not isinstance(log, list) or not log:
        return None
    ok_rows = [
        row
        for row in log
        if isinstance(row, dict)
        and row.get("ok")
        and str(row.get("tool") or "") in {
            "CreateMemory",
            "UpdateMemoryFields",
            "UpdateMemoryContent",
            "UpdateMemoryMeta",
            "MoveMemory",
            "DeleteMemory",
        }
    ]
    if len(ok_rows) < min_entries:
        return None
    creates = [row for row in ok_rows if row.get("tool") == "CreateMemory"]
    lines = [
        "【记忆写入批结果】以下工具调用已成功，请勿重复 CreateMemory 同名 scope 根节点：",
    ]
    for row in ok_rows[-12:]:
        tool = str(row.get("tool") or "")
        title = str(row.get("title") or row.get("summary") or "").strip()
        scope = str(row.get("scope") or "").strip()
        mid = str(row.get("item_id") or "").strip()
        label = title or scope or mid[:8] or tool
        extra = []
        if scope and scope != label:
            extra.append(f"scope={scope}")
        if mid:
            extra.append(f"memory_id={mid}")
        suffix = f" ({', '.join(extra)})" if extra else ""
        lines.append(f"- {tool}: {label}{suffix}")
    index = patch.get("memory_tree_index")
    if isinstance(index, dict) and index:
        root_ids = extract_scope_root_ids(
            {
                str(k): v
                for k, v in index.items()
                if isinstance(v, dict)
            }
        )
        if root_ids:
            lines.append("scope_root_ids（CreateMemory child 必填 parent_id）：")
            for scope in sorted(root_ids.keys()):
                lines.append(f"  - scope={scope} → parent_id={root_ids[scope]}")
        else:
            scopes = ", ".join(sorted(str(k) for k in index.keys()))
            lines.append(f"memory_index 当前 scope：{scopes}")
    if len(creates) >= 2:
        lines.append(f"CreateMemory 成功 {len(creates)} 个根分类，均已写入，无需再次创建。")
    return "\n".join(lines)


def format_memory_ops_for_plan(log: Any, *, max_items: int = 12) -> str:
    lines: list[str] = []
    for row in memory_ops_for_plan_json(log, max_items=max_items):
        status = "OK" if row.get("ok") else "FAIL"
        parts = [status, str(row.get("tool") or "")]
        for key in ("scope", "item_id", "key", "title"):
            val = row.get(key)
            if val:
                parts.append(f"{key}={val}")
        note = str(row.get("note") or "").strip()
        if note:
            parts.append(note)
        lines.append(" · ".join(parts))
    return "\n".join(lines)


def format_character_roster_for_plan(
    roster: Any,
    last_read: Any = None,
) -> str:
    if isinstance(roster, list) and roster:
        return "character_roster：" + ", ".join(str(x) for x in roster)
    if isinstance(last_read, dict) and last_read.get("ok") and last_read.get("scope") == "character":
        names = last_read.get("item_ids") or []
        if names:
            return "character_roster：" + ", ".join(str(n) for n in names)
    return ""
