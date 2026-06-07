"""Choose options builder — heuristic fallback when LLM is unavailable."""

from __future__ import annotations

from typing import Any

from app.agent.harness.routing_protocol import strip_step_routing
from app.agent.schemas import AgentRunContext, DisplayPayload, StepResult


def heuristic_choices(subject: str, mode: str = "auto") -> list[dict[str, Any]]:
    """Topic-aware fallback options (not fixed game-world templates)."""
    _ = mode
    topic = (subject or "续写").strip()[:40]

    return [
        {
            "id": "h1",
            "title": "氛围铺陈",
            "description": f"以场景与感官细节开篇，紧扣「{topic}」，围绕用户需求定下情绪基调",
        },
        {
            "id": "h2",
            "title": "人物驱动",
            "description": f"从角色动机与关系切入，让「{topic}」通过行动与对话自然展开",
        },
        {
            "id": "h3",
            "title": "悬念转折",
            "description": f"在「{topic}」中埋入异常线索或意外事件，结尾留钩子",
        },
        {
            "id": "h4",
            "title": "抒情内省",
            "description": f"偏重内心独白或回忆片段，细腻呈现「{topic}」的情感层次",
        },
    ]


def build_interaction(
    choices: list[dict[str, Any]],
    *,
    subject: str,
    interaction_type: str = "multi_select",
    allow_custom: bool = True,
    prompt: str | None = None,
    min_select: int | None = None,
    max_select: int | None = None,
) -> dict[str, Any]:
    topic = (subject or "创作").strip()[:40]
    itype = interaction_type if interaction_type in (
        "single_select",
        "multi_select",
        "user_input",
    ) else "multi_select"

    if itype == "user_input":
        return {
            "type": "user_input",
            "prompt": prompt or f"请补充你对「{topic}」的具体设想（人物、场景、文风、篇幅等）",
            "free_text_hint": "例如：第三人称、雨夜便利店、治愈向、约 800 字",
            "options": choices or None,
        }

    base: dict[str, Any] = {
        "type": itype,
        "prompt": prompt
        or (
            f"请勾选 1–3 个创作方向，或在下方输入自定义说明，然后点击提交（主题：{topic}）"
            if itype == "multi_select"
            else f"请选择一个创作方向后点击提交（主题：{topic}）"
        ),
        "options": choices,
    }
    if itype == "multi_select":
        base["min_select"] = min_select if min_select is not None else 1
        base["max_select"] = max_select if max_select is not None else min(3, len(choices))
    if allow_custom:
        base["allow_custom"] = True
        base["free_text_hint"] = "或在下方输入你自己的方向/补充说明"
    return base


def build_choose_wait_result(
    ctx: AgentRunContext,
    *,
    reason: str,
    topic: str | None = None,
    choices: list[dict[str, Any]] | None = None,
    interaction: dict[str, Any] | None = None,
) -> StepResult:
    subject = (topic or ctx.user_message or "续写").strip()
    resolved_choices = choices or heuristic_choices(subject, ctx.mode)
    resolved_interaction = interaction or build_interaction(
        resolved_choices,
        subject=subject,
        interaction_type="multi_select",
        allow_custom=True,
    )
    return strip_step_routing(
        StepResult(
            step_kind="choose",
            action="wait",
            wait_for="interaction",
            next_input={},
            context_patch={},
            display=DisplayPayload(
                type="tool",
                tool="choose",
                choices=resolved_choices,
                interaction=resolved_interaction,
            ),
            reason=reason,
        )
    )
