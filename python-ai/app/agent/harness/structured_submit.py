"""Merge streamed visible Markdown with forced StepResult tool submission."""

from __future__ import annotations

import logging
from collections.abc import Callable

from langchain_core.messages import BaseMessage

from app.agent.context.prompting.tool_prompt import build_step_submit_messages as _build_step_submit
from app.agent.harness.structured_llm import invoke_structured_with_retry
from app.agent.schemas import DisplayPayload, StepResult
from app.runtime.text_sanitize import extract_visible_text

logger = logging.getLogger(__name__)


def visible_markdown_text(raw: str) -> str:
    return extract_visible_text(raw or "").strip()


async def submit_step_after_stream(
    submit_messages: list[BaseMessage],
    *,
    step_kind: str,
    visible_markdown: str,
    profile: str | None = None,
    fallback: Callable[[], StepResult],
    merge: Callable[[StepResult, str], StepResult] | None = None,
) -> StepResult:
    """Structured tool with CC-style retry; stream fallback only if all attempts fail."""
    visible = visible_markdown_text(visible_markdown)
    try:
        structured = await invoke_structured_with_retry(
            submit_messages,
            StepResult,
            profile=profile,
            retry_feedback_prefix="StepResult schema validation failed",
            use_retry_json=True,
        )
    except Exception:
        logger.warning(
            "structured StepResult failed step_kind=%s after retries, using stream fallback",
            step_kind,
        )
        return fallback()

    result = structured
    if result.step_kind != step_kind:
        result = result.model_copy(update={"step_kind": step_kind})
    if merge is not None:
        result = merge(result, visible)
    else:
        result = _default_merge(result, visible, step_kind=step_kind)
    return result.model_copy(update={"display": DisplayPayload(type="none")})


def _default_merge(result: StepResult, visible: str, *, step_kind: str) -> StepResult:
    patch = dict(result.context_patch or {})
    if step_kind == "think" and visible:
        patch["think_summary"] = visible[:4000]
    updates: dict = {"context_patch": patch}
    if result.action == "wait":
        updates["action"] = "continue"
        updates["wait_for"] = None
    if step_kind == "think" and (result.next_tool or "").strip():
        updates["next_tool"] = ""
        updates["next_input"] = {}
    return result.model_copy(update=updates)


def build_step_submit_messages(
    *,
    extra_system: str,
    visible_markdown: str,
    human_hint: str = "请提交 StepResult。",
) -> list[BaseMessage]:
    return _build_step_submit(
        tool_name="step",
        extra_system=extra_system,
        visible_markdown=visible_markdown,
        human_hint=human_hint,
    )
