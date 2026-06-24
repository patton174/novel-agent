"""Structured JSON context helpers — plan/retry/think; assembly in run_context."""

from __future__ import annotations

from typing import Any

from app.agent.schemas import PlanRequest


def has_character_roster_snapshot(patch: dict[str, Any] | None) -> bool:
    """True when planner already has a character roster from ListMemory / GetMemoryTree."""
    if not isinstance(patch, dict):
        return False
    if isinstance(patch.get("character_roster"), list) and patch["character_roster"]:
        return True
    last = patch.get("last_memory_read")
    return isinstance(last, dict) and last.get("ok") and last.get("scope") == "character"


def summarize_memory_read(result: dict[str, Any] | None, *, preview_len: int = 120) -> dict[str, Any]:
    """Compact last_memory_read for context_patch / planner."""
    if not isinstance(result, dict):
        return {"ok": False, "reason": "invalid read result"}
    if not result.get("ok"):
        return {
            "ok": False,
            "scope": result.get("scope"),
            "reason": str(result.get("reason") or "read failed")[:200],
        }
    out: dict[str, Any] = {"ok": True}
    if result.get("scope"):
        out["scope"] = result["scope"]
    if result.get("memory_id"):
        out["memory_id"] = str(result["memory_id"])
    if "value_preview" in result:
        out["value_preview"] = str(result["value_preview"])[:preview_len]
    return out


def summarize_memory_patch(result: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(result, dict):
        return {"ok": False, "reason": "invalid patch result"}
    if not result.get("ok"):
        return {
            "ok": False,
            "reason": str(result.get("reason") or "patch failed")[:200],
        }
    out: dict[str, Any] = {
        "ok": True,
        "changed": result.get("changed"),
    }
    if result.get("memory_id"):
        out["memory_id"] = str(result["memory_id"])
    if result.get("scope"):
        out["scope"] = result["scope"]
    return {k: v for k, v in out.items() if v is not None}


def summarize_memory_delete(result: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(result, dict):
        return {"ok": False, "reason": "invalid delete result"}
    if not result.get("ok"):
        out: dict[str, Any] = {
            "ok": False,
            "reason": str(result.get("reason") or "delete failed")[:200],
        }
        if result.get("scope"):
            out["scope"] = result["scope"]
        if result.get("item_id"):
            out["item_id"] = result["item_id"]
        if result.get("key"):
            out["key"] = result["key"]
        return out
    out = {
        "ok": True,
        "deleted": result.get("deleted", True),
    }
    if result.get("memory_id"):
        out["memory_id"] = str(result["memory_id"])
    if result.get("scope"):
        out["scope"] = result["scope"]
    return {k: v for k, v in out.items() if v is not None}


def _transcript_has_interaction(transcript_rows: list) -> bool:
    if not isinstance(transcript_rows, list):
        return False
    return any(isinstance(row, dict) and row.get("kind") == "interaction" for row in transcript_rows)


def think_text_from_rows(
    transcript_rows: list[dict[str, Any]] | None,
    *,
    think_content: str = "",
    think_summary: str = "",
) -> str:
    rows = transcript_rows or []
    if isinstance(rows, list):
        for row in reversed(rows):
            if isinstance(row, dict) and row.get("kind") == "think":
                text = str(row.get("summary") or "").strip()
                if text:
                    return text
    full = (think_content or "").strip()
    if full:
        return full
    return (think_summary or "").strip()


def think_has_pending_confirm_from_rows(think: str, transcript_rows: list[dict[str, Any]] | None) -> bool:
    rows = transcript_rows or []
    if isinstance(rows, list) and rows:
        last_think_idx = -1
        for i, row in enumerate(rows):
            if isinstance(row, dict) and row.get("kind") == "think":
                last_think_idx = i
        if last_think_idx >= 0:
            block = str(rows[last_think_idx].get("summary") or "")
            if "待确认" not in block:
                return False
            for row in rows[last_think_idx + 1 :]:
                if isinstance(row, dict) and row.get("kind") == "interaction":
                    return False
            return True
    return "待确认" in (think or "")


def think_text_for_plan(req: PlanRequest) -> str:
    """Prefer live transcript think over frozen run-start think."""
    rows = getattr(req, "transcript", None) or []
    return think_text_from_rows(
        rows if isinstance(rows, list) else [],
        think_content=req.think_content or "",
        think_summary=str((req.context.context_patch or {}).get("think_summary") or ""),
    )


def think_has_pending_confirm(req: PlanRequest) -> bool:
    think = think_text_for_plan(req)
    rows = getattr(req, "transcript", None) or []
    return think_has_pending_confirm_from_rows(
        think,
        rows if isinstance(rows, list) else [],
    )


def build_plan_context(req: PlanRequest, *, retry_feedback: str = "") -> dict[str, Any]:
    """Assemble planner context — delegates to unified assemble_agent_context."""
    from app.agent.context.prompting.run_context import assemble_agent_context

    rows = getattr(req, "transcript", None) or []
    return assemble_agent_context(
        req.context,
        transcript_rows=rows if isinstance(rows, list) else [],
        think_content=think_text_for_plan(req),
        retry_feedback=retry_feedback,
        profile="full",
    )


def format_plan_context_message(req: PlanRequest, *, retry_feedback: str = "") -> str:
    from app.agent.context.prompting.blocks import join_human_blocks, json_block

    payload = build_plan_context(req, retry_feedback=retry_feedback)
    return join_human_blocks(json_block("RUN_CONTEXT_JSON", payload))
