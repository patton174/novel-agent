"""Structured session recall — CC-style turns instead of flat dialogue dumps."""

from __future__ import annotations

from typing import Any, Literal

from app.agent.schemas import AgentRunContext

RecallKind = Literal["user", "assistant", "tool", "think", "interaction", "plan"]

_PRIOR_TURN_MAX = 20
_PRIOR_CONTENT_MAX = 900
_RUN_SUMMARY_MAX = 600
_RECALL_BUDGET_CHARS = 4800


def _normalize_role(role: str) -> RecallKind | None:
    r = str(role or "").strip().lower()
    if r == "user":
        return "user"
    if r == "assistant":
        return "assistant"
    return None


def _trim(text: str, limit: int) -> str:
    body = str(text or "").strip()
    if len(body) <= limit:
        return body
    return body[: limit - 1] + "…"


def _prior_turns_from_history(ctx: AgentRunContext) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for turn in (ctx.history or [])[-_PRIOR_TURN_MAX:]:
        if not isinstance(turn, dict):
            continue
        role = _normalize_role(str(turn.get("role") or ""))
        content = str(turn.get("content") or "").strip()
        if not role or not content:
            continue
        if role == "user" and content.startswith("我的回答："):
            continue
        rows.append(
            {
                "kind": role,
                "content": _trim(content, _PRIOR_CONTENT_MAX),
            }
        )
    return rows


def _current_run_from_transcript(
    transcript_rows: list[dict[str, Any]] | None,
) -> list[dict[str, Any]]:
    if not isinstance(transcript_rows, list):
        return []
    out: list[dict[str, Any]] = []
    for row in transcript_rows:
        if not isinstance(row, dict):
            continue
        kind = str(row.get("kind") or "").strip().lower()
        if kind not in ("tool", "think", "interaction", "plan"):
            continue
        entry: dict[str, Any] = {
            "kind": kind,
            "summary": _trim(str(row.get("summary") or ""), _RUN_SUMMARY_MAX),
        }
        tool = str(row.get("tool") or "").strip()
        if tool:
            entry["tool"] = tool
        if entry["summary"]:
            out.append(entry)
    return out


def _dedupe_last_user(prior: list[dict[str, Any]], user_message: str) -> list[dict[str, Any]]:
    """Drop trailing prior user turn when it matches the current user_message."""
    msg = str(user_message or "").strip()
    if not msg or not prior:
        return prior
    last = prior[-1]
    if last.get("kind") != "user":
        return prior
    if str(last.get("content") or "").strip() == msg:
        return prior[:-1]
    return prior


def _apply_budget(prior: list[dict[str, Any]], current_run: list[dict[str, Any]]) -> tuple[list, list, bool]:
    """Tail-bias both lists under a shared char budget."""
    trimmed_prior = list(prior)
    trimmed_run = list(current_run)
    truncated = False

    def total() -> int:
        return sum(len(str(r)) for r in trimmed_prior) + sum(len(str(r)) for r in trimmed_run)

    while total() > _RECALL_BUDGET_CHARS and trimmed_prior:
        trimmed_prior.pop(0)
        truncated = True
    while total() > _RECALL_BUDGET_CHARS and trimmed_run:
        trimmed_run.pop(0)
        truncated = True
    return trimmed_prior, trimmed_run, truncated


def format_session_recall(
    ctx: AgentRunContext,
    *,
    transcript_rows: list[dict[str, Any]] | None = None,
) -> dict[str, Any] | None:
    """
    CC-aligned structured recall:
    - prior_turns: persisted session user/assistant messages (not flat text)
    - current_run: in-run tool/think/interaction/plan rows (when mid-run)
    """
    prior = _dedupe_last_user(_prior_turns_from_history(ctx), str(ctx.user_message or ""))
    current_run = _current_run_from_transcript(transcript_rows)
    if not prior and not current_run:
        return None

    prior, current_run, truncated = _apply_budget(prior, current_run)
    block: dict[str, Any] = {}
    if prior:
        block["prior_turns"] = prior
    if current_run:
        block["current_run"] = current_run
    block["hint"] = (
        "Structured session recall. prior_turns = earlier user/assistant messages; "
        "current_run = this run's tool/think steps. Use ReadChapter/ReadMemory for exact bodies."
    )
    if truncated:
        block["truncated"] = True
    return block
