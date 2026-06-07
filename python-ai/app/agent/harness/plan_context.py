"""Structured JSON context for agent run loop — replaceable slots, bounded size."""

from __future__ import annotations

import json
from typing import Any

from app.agent.context.compact import compact_story_memory_text, format_chapter_window
from app.agent.context.memory_log import memory_ops_for_plan_json
from app.agent.harness.intent_message import intent_user_message_for_context
from app.agent.harness.orchestration_contract import context_decision_hints
from app.agent.harness.routing import (
    format_dialogue_history,
    project_summary_from_ctx,
)
from app.agent.schemas import PlanRequest

_PREVIEW_CHAR = 120
_CHARACTER_ROSTER_PREVIEW = 520
_CHARACTER_ROSTER_BUDGET = 4800
_VALUE_PREVIEW = 400
_STORY_SNAPSHOT_MAX = 800
_DIALOGUE_MAX = 2000
_USER_MESSAGE_MAX = 800
_RETRIEVED_MAX = 800


def _character_entry_plan_preview(attrs: Any, *, max_len: int) -> str:
    """Structured one-line summary for planner (not raw 人物卡 JSON dump)."""
    if not isinstance(attrs, dict):
        return str(attrs or "")[:max_len]
    parts: list[str] = []
    for key in ("身份", "性格", "能力体系", "人物关系", "剧情作用"):
        val = attrs.get(key)
        if val is not None and str(val).strip():
            parts.append(f"{key}:{str(val).strip()[:72]}")
    card_raw = str(attrs.get("人物卡") or "").strip()
    if card_raw:
        if card_raw.startswith("{"):
            try:
                parsed = json.loads(card_raw)
                if isinstance(parsed, dict):
                    for key in ("身份", "性格", "目标", "缺陷", "外貌"):
                        val = parsed.get(key)
                        if val is not None and str(val).strip():
                            parts.append(f"{key}:{str(val).strip()[:56]}")
                else:
                    parts.append(card_raw[: min(160, max_len)])
            except json.JSONDecodeError:
                parts.append(card_raw[: min(200, max_len)])
        else:
            parts.append(card_raw[: min(200, max_len)])
    if not parts:
        for key, val in list(attrs.items())[:4]:
            if val is not None and str(val).strip():
                parts.append(f"{key}:{str(val).strip()[:48]}")
    text = " | ".join(parts)
    return text[:max_len] if text else "（无字段）"


def has_character_roster_snapshot(patch: dict[str, Any] | None) -> bool:
    """True when planner already has a character roster read (avoid repeat memory_read loops)."""
    if not isinstance(patch, dict):
        return False
    if isinstance(patch.get("character_roster"), list) and patch["character_roster"]:
        return True
    last = patch.get("last_memory_read")
    if not isinstance(last, dict) or not last.get("ok"):
        return False
    if last.get("scope") != "character":
        return False
    if last.get("roster_loaded"):
        return True
    if last.get("previews") or last.get("item_ids"):
        return True
    return False


def summarize_memory_read(result: dict[str, Any] | None, *, preview_len: int = _PREVIEW_CHAR) -> dict[str, Any]:
    """Compact last_memory_read for context_patch / planner (no full entries blob)."""
    if not isinstance(result, dict):
        return {"ok": False, "reason": "invalid read result"}
    if not result.get("ok"):
        return {
            "ok": False,
            "scope": result.get("scope"),
            "reason": str(result.get("reason") or "read failed")[:200],
        }
    scope = result.get("scope")
    out: dict[str, Any] = {"ok": True, "scope": scope}
    if result.get("key"):
        out["key"] = result["key"]
    if result.get("item_id"):
        out["item_id"] = result["item_id"]
    if "value" in result:
        out["value_preview"] = str(result.get("value") or "")[:_VALUE_PREVIEW]
        return out
    if "item_ids" in result:
        ids = [str(x) for x in (result.get("item_ids") or [])]
        out["count"] = int(result.get("count") or len(ids))
        out["item_ids"] = ids[:40]
        entries = result.get("entries") if isinstance(result.get("entries"), dict) else {}
        if scope == "character" and entries:
            per_char = (
                _CHARACTER_ROSTER_PREVIEW
                if not result.get("item_id")
                else min(preview_len, _VALUE_PREVIEW)
            )
            previews: dict[str, str] = {}
            budget = _CHARACTER_ROSTER_BUDGET
            for name, attrs in list(entries.items())[:24]:
                if budget <= 0:
                    break
                line = _character_entry_plan_preview(attrs, max_len=per_char)
                previews[str(name)] = line
                budget -= len(line)
            if previews:
                out["previews"] = previews
                out["roster_loaded"] = True
        elif scope == "character" and ids:
            out["roster_loaded"] = True
        return out
    entries = result.get("entries") if isinstance(result.get("entries"), dict) else {}
    if entries:
        keys = list(entries.keys())
        out["keys"] = keys[:30]
        out["count"] = len(keys)
        if len(entries) <= 6:
            out["entries_preview"] = {
                str(k): str(v)[:200] for k, v in list(entries.items())[:6]
            }
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
        "scope": result.get("scope"),
        "key": result.get("key"),
        "changed": result.get("changed"),
    }
    if result.get("item_id"):
        out["item_id"] = result["item_id"]
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
        "scope": result.get("scope"),
        "deleted": result.get("deleted", True),
    }
    if result.get("item_id"):
        out["item_id"] = result["item_id"]
    if result.get("key"):
        out["key"] = result["key"]
    return {k: v for k, v in out.items() if v is not None}


def _character_roster(patch: dict[str, Any]) -> list[str]:
    roster = patch.get("character_roster")
    if isinstance(roster, list) and roster:
        return [str(x) for x in roster]
    last_read = patch.get("last_memory_read")
    if isinstance(last_read, dict) and last_read.get("scope") == "character":
        ids = last_read.get("item_ids")
        if isinstance(ids, list) and ids:
            return [str(x) for x in ids]
    return []


def think_text_for_plan(req: PlanRequest) -> str:
    """Prefer live transcript think over frozen run-start think."""
    transcript = getattr(req, "transcript", None) or []
    if isinstance(transcript, list):
        for row in reversed(transcript):
            if isinstance(row, dict) and row.get("kind") == "think":
                text = str(row.get("summary") or "").strip()
                if text:
                    return text
    full = (req.think_content or "").strip()
    if full:
        return full
    patch = req.context.context_patch if isinstance(req.context.context_patch, dict) else {}
    return str(patch.get("think_summary") or "").strip()


def think_has_pending_confirm(req: PlanRequest) -> bool:
    transcript = getattr(req, "transcript", None) or []
    if isinstance(transcript, list) and transcript:
        last_think_idx = -1
        for i, row in enumerate(transcript):
            if isinstance(row, dict) and row.get("kind") == "think":
                last_think_idx = i
        if last_think_idx >= 0:
            think = str(transcript[last_think_idx].get("summary") or "")
            if "待确认" not in think:
                return False
            for row in transcript[last_think_idx + 1 :]:
                if isinstance(row, dict) and row.get("kind") == "interaction":
                    return False
            return True
    return "待确认" in think_text_for_plan(req)


def _transcript_has_interaction(transcript_rows: list) -> bool:
    if not isinstance(transcript_rows, list):
        return False
    return any(isinstance(row, dict) and row.get("kind") == "interaction" for row in transcript_rows)


def build_plan_context(req: PlanRequest, *, retry_feedback: str = "") -> dict[str, Any]:
    """Assemble planner context — static fields first for MiniMax prompt cache prefix."""
    ctx = req.context
    patch = ctx.context_patch if isinstance(ctx.context_patch, dict) else {}
    transcript_rows = getattr(req, "transcript", None) or []

    intent: dict[str, Any] = {
        "user_message": intent_user_message_for_context(
            str(ctx.user_message or ""),
            has_run_interaction=_transcript_has_interaction(transcript_rows),
        )[:_USER_MESSAGE_MAX],
    }
    if ctx.selected_choice and _transcript_has_interaction(transcript_rows):
        intent["selected_choice"] = ctx.selected_choice
    if isinstance(transcript_rows, list):
        for row in reversed(transcript_rows):
            if isinstance(row, dict) and row.get("kind") == "interaction":
                intent["latest_interaction"] = str(row.get("summary") or "")[:1200]
                break
    if _transcript_has_interaction(transcript_rows):
        interactions = patch.get("user_interactions")
        if isinstance(interactions, list) and interactions:
            last = interactions[-1]
            if isinstance(last, dict) and last.get("text"):
                intent.setdefault(
                    "latest_interaction",
                    str(last["text"])[:1200],
                )

    memory_stable: dict[str, Any] = {}
    roster = _character_roster(patch)
    if roster:
        memory_stable["character_roster"] = roster

    story = compact_story_memory_text(str(ctx.story_memory or ""), max_len=_STORY_SNAPSHOT_MAX)
    if story:
        memory_stable["story_snapshot"] = story

    chapter_window = format_chapter_window(ctx)
    if chapter_window:
        memory_stable["chapter_window"] = chapter_window[:1200]

    memory_dynamic: dict[str, Any] = {}
    last_read = patch.get("last_memory_read")
    if isinstance(last_read, dict):
        memory_dynamic["last_read"] = summarize_memory_read(last_read)
    last_write = patch.get("last_memory_patch")
    if isinstance(last_write, dict):
        memory_dynamic["last_write"] = summarize_memory_patch(last_write)
    last_delete = patch.get("last_memory_delete")
    if isinstance(last_delete, dict):
        memory_dynamic["last_delete"] = summarize_memory_delete(last_delete)

    ops = memory_ops_for_plan_json(patch.get("memory_ops_log"))
    if ops:
        memory_dynamic["ops_log"] = ops

    run: dict[str, Any] = {
        "mode": ctx.mode,
        "step_index": ctx.step_index,
    }
    if ctx.last_tool:
        run["last_tool"] = ctx.last_tool
    if ctx.last_reason:
        run["last_reason"] = str(ctx.last_reason)[:240]
    if ctx.last_tool == "output":
        lr = str(ctx.last_reason or "")
        if "output continue" in lr:
            run["prior_output"] = "continue"
        elif "output ok" in lr:
            run["prior_output"] = "done"
    out: dict[str, Any] = {
        "intent": intent,
        "decision_hints": context_decision_hints(),
    }

    transcript = getattr(req, "transcript", None) or []
    if isinstance(transcript, list) and transcript:
        out["transcript"] = transcript[-40:]

    project = project_summary_from_ctx(ctx)
    if project:
        out["project"] = project[:600]

    think = think_text_for_plan(req)
    if think:
        out["think"] = think
        if think_has_pending_confirm(req):
            out["think_has_pending_confirm"] = True

    dialogue = format_dialogue_history(ctx, max_len=_DIALOGUE_MAX)
    if dialogue:
        out["dialogue"] = dialogue[:_DIALOGUE_MAX]

    retrieved = patch.get("retrieved_context")
    if isinstance(retrieved, str) and retrieved.strip():
        out["retrieved"] = retrieved.strip()[:_RETRIEVED_MAX]

    memory: dict[str, Any] = {}
    memory.update(memory_stable)
    memory.update(memory_dynamic)
    if memory:
        out["memory"] = memory

    out["run"] = run

    if retry_feedback.strip():
        out["retry"] = retry_feedback.strip()[:500]

    return out


def format_plan_context_message(req: PlanRequest, *, retry_feedback: str = "") -> str:
    """PLAN_CONTEXT_JSON block (tests / legacy label; main loop uses RUN_CONTEXT_JSON)."""
    from app.agent.context.prompting.blocks import join_human_blocks, json_block

    payload = build_plan_context(req, retry_feedback=retry_feedback)
    return join_human_blocks(json_block("PLAN_CONTEXT_JSON", payload))
