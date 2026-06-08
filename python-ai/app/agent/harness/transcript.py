"""Run transcript — message log for agent loop context."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

from app.agent.schemas import StepResult

EntryKind = Literal["think", "tool", "interaction", "plan"]


@dataclass
class TranscriptEntry:
    kind: EntryKind
    summary: str
    tool: str | None = None
    detail: str | None = None
    meta: dict[str, Any] = field(default_factory=dict)


class AgentTranscript:
    """Append-only run log; planner reads compact tail, not frozen think."""

    def __init__(self) -> None:
        self.entries: list[TranscriptEntry] = []

    def append_think(self, text: str) -> None:
        trimmed = (text or "").strip()
        if not trimmed:
            return
        self.entries.append(
            TranscriptEntry(kind="think", summary=trimmed[:4000], tool="think")
        )

    def append_plan(self, reason: str, tools: list[str]) -> None:
        label = ", ".join(tools) if tools else "end"
        self.entries.append(
            TranscriptEntry(
                kind="plan",
                summary=f"编排：{reason or label}"[:500],
                meta={"tools": tools},
            )
        )

    def append_tool_result(
        self,
        tool: str,
        result: StepResult,
        *,
        output_text: str = "",
    ) -> None:
        display = result.display
        content = (output_text or display.content or "").strip()
        if not content and result.reason:
            content = result.reason
        summary = content.replace("\n", " ")[:600] if content else result.reason[:200]
        self.entries.append(
            TranscriptEntry(
                kind="tool",
                tool=tool,
                summary=summary or f"{tool} 完成",
                detail=content[:3000] if content else None,
                meta={
                    "action": result.action,
                    "reason": result.reason[:240],
                },
            )
        )

    def append_interaction(self, interaction: dict[str, Any]) -> None:
        text = _summarize_interaction(interaction)
        if not text:
            return
        self.entries.append(
            TranscriptEntry(
                kind="interaction",
                summary=text[:2000],
                meta={"type": interaction.get("type", "interaction")},
            )
        )

    def latest_think_text(self) -> str:
        for entry in reversed(self.entries):
            if entry.kind == "think":
                return entry.summary
        return ""

    def latest_interaction_summary(self) -> str:
        for entry in reversed(self.entries):
            if entry.kind == "interaction":
                return entry.summary
        return ""

    def has_pending_confirm_after_think(self) -> bool:
        """True only if think mentions 待确认 and user has not answered since."""
        last_think_idx = -1
        for i, entry in enumerate(self.entries):
            if entry.kind == "think":
                last_think_idx = i
        if last_think_idx < 0:
            return False
        think = self.entries[last_think_idx].summary
        if "待确认" not in think:
            return False
        for entry in self.entries[last_think_idx + 1 :]:
            if entry.kind == "interaction":
                return False
        return True

    def format_for_plan(self, *, max_chars: int = 14000) -> list[dict[str, Any]]:
        """Tail-biased JSON rows for CONTEXT_JSON.transcript."""
        rows: list[dict[str, Any]] = []
        total = 0
        for entry in reversed(self.entries):
            row: dict[str, Any] = {"kind": entry.kind, "summary": entry.summary}
            if entry.tool:
                row["tool"] = entry.tool
            if entry.meta:
                row["meta"] = entry.meta
            size = len(str(row))
            if total + size > max_chars and rows:
                break
            rows.insert(0, row)
            total += size
        return rows

    def append_autocompact_summary(self, summary: str) -> None:
        """Record LLM autocompact summary for RUN_CONTEXT / planner transcript."""
        body = (summary or "").strip()
        if not body:
            return
        self.entries.append(
            TranscriptEntry(
                kind="think",
                summary=f"[autocompact] {body[:500]}",
                detail=body[:8000],
                meta={"autocompact": True},
            )
        )

    def compact(self, *, max_entries: int = 24, max_chars: int = 8000) -> int:
        """Drop oldest entries and shorten summaries when context is too large."""
        before = len(self.entries)
        if before <= max_entries and sum(len(e.summary) for e in self.entries) <= max_chars:
            return 0
        while len(self.entries) > max_entries:
            self.entries.pop(0)
        total = sum(len(e.summary) for e in self.entries)
        if total > max_chars:
            for entry in self.entries:
                if entry.kind == "think":
                    entry.summary = entry.summary[:400]
                elif entry.kind == "tool":
                    entry.summary = entry.summary[:220]
                    if entry.detail:
                        entry.detail = entry.detail[:600]
                elif entry.kind == "plan":
                    entry.summary = entry.summary[:180]
                else:
                    entry.summary = entry.summary[:300]
            while self.entries and sum(len(e.summary) for e in self.entries) > max_chars:
                self.entries.pop(0)
        return max(0, before - len(self.entries))


def _summarize_interaction(interaction: dict[str, Any]) -> str:
    answers = interaction.get("answers")
    if isinstance(answers, dict) and answers:
        parts: list[str] = []
        for qid, ans in answers.items():
            if isinstance(ans, dict):
                if ans.get("choice"):
                    c = ans["choice"]
                    title = c.get("title") if isinstance(c, dict) else str(c)
                    parts.append(f"{qid}: {title}")
                elif ans.get("selected"):
                    titles = [
                        str(x.get("title", x)) if isinstance(x, dict) else str(x)
                        for x in ans["selected"]
                    ]
                    parts.append(f"{qid}: {', '.join(titles)}")
                elif ans.get("input"):
                    parts.append(f"{qid}: {ans['input']}")
        if parts:
            return "用户回答：" + "；".join(parts)
    inp = interaction.get("input")
    if isinstance(inp, str) and inp.strip():
        return f"用户输入：{inp.strip()}"
    selected = interaction.get("selected")
    if isinstance(selected, list) and selected:
        titles = [
            str(x.get("title", x)) if isinstance(x, dict) else str(x) for x in selected
        ]
        return "用户选择：" + "、".join(titles)
    if isinstance(selected, dict):
        return "用户选择：" + str(selected.get("title") or selected)
    return ""


def apply_interaction_to_context(
    patch: dict[str, Any],
    interaction: dict[str, Any],
) -> dict[str, Any]:
    """Merge user interaction into context_patch (mirrors Java applyInteraction)."""
    out = dict(patch or {})
    text = _summarize_interaction(interaction)
    if not text:
        return out
    log = out.get("user_interactions")
    if not isinstance(log, list):
        log = []
    else:
        log = list(log)
    for existing in log:
        if isinstance(existing, dict) and text == str(existing.get("text", "")).strip():
            return out
    log.append(
        {
            "type": str(interaction.get("type") or "interaction"),
            "text": text,
        }
    )
    out["user_interactions"] = log[-20:]
    inp = interaction.get("input")
    if isinstance(inp, str) and inp.strip():
        out["selected_choice"] = {
            "id": "custom",
            "title": inp.strip(),
            "description": "",
        }
        return out
    selected = interaction.get("selected")
    if isinstance(selected, list) and selected:
        if len(selected) == 1 and isinstance(selected[0], dict):
            out["selected_choice"] = dict(selected[0])
        else:
            titles = [
                str(x.get("title", "")) if isinstance(x, dict) else str(x)
                for x in selected
            ]
            out["selected_choice"] = {
                "id": "multi",
                "title": "、".join(titles),
                "description": "",
            }
    elif isinstance(selected, dict):
        out["selected_choice"] = dict(selected)
    return out
