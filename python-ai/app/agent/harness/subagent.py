"""Run nested query_loop for Agent-tool subtasks (sync, in-process)."""

from __future__ import annotations

import logging
from typing import Any
from uuid import uuid4

from app.agent.harness.subagent_policy import (
    SUBAGENT_EXCLUDED_TOOLS,
    subagent_depth,
)
from app.agent.schemas import AgentRunContext, RunRequest
from app.agent.tools.tool import ToolCallResult
from app.config import settings

logger = logging.getLogger(__name__)

_PATCH_DEPTH = "_subagent_depth"
_PATCH_MAX_TURNS = "_max_turns"
_PATCH_PARENT_RUN = "_parent_run_id"
_PATCH_DISABLE_DEFER = "_subagent_disable_defer"
_PATCH_DESCRIPTION = "_subagent_description"


def build_subagent_context(
    parent: AgentRunContext,
    *,
    description: str,
    prompt: str,
    extra_patch: dict[str, Any] | None = None,
) -> AgentRunContext:
    depth = subagent_depth(parent)
    child_patch = dict(parent.context_patch or {})
    child_patch[_PATCH_DEPTH] = depth + 1
    child_patch[_PATCH_MAX_TURNS] = settings.agent_subagent_max_turns
    child_patch[_PATCH_PARENT_RUN] = parent.run_id
    child_patch[_PATCH_DISABLE_DEFER] = True
    child_patch[_PATCH_DESCRIPTION] = (description or "")[:200]
    child_patch.pop("agent_prompt", None)
    child_patch.pop("tasks", None)
    if extra_patch:
        child_patch.update(extra_patch)

    return parent.model_copy(
        update={
            "run_id": f"{parent.run_id}-sub-{uuid4().hex[:8]}",
            "message_id": f"{parent.message_id}-sub",
            "user_message": (prompt or "").strip(),
            "history": [],
            "step_index": 0,
            "last_tool": None,
            "last_reason": None,
            "selected_choice": None,
            "context_patch": child_patch,
        }
    )


def build_subagent_system_prompt() -> str:
    from app.agent.tools.registry import get_all_tools

    names = ", ".join(
        sorted(t.name for t in get_all_tools() if t.name not in SUBAGENT_EXCLUDED_TOOLS)
    )
    max_turns = settings.agent_subagent_max_turns
    return f"""You are a **sub-agent** for a novel-writing task. The parent agent delegated one focused slice.

Available tools: {names}

Rules:
- Complete **only** the delegated task in the user message. Do not expand scope.
- **Batch size**: at most 3–4 chapters (or 3–4 memory writes) per turn; use multiple turns if needed (max ~{max_turns} turns).
- Use RUN_CONTEXT `chapter_catalog` / `memory_catalog` for UUIDs; chapter memory → `/memory/chapter/{{chapter_id}}.json` only.
- Glob/Grep are paths only → must Read for bodies. Do not call removed tools.
- **No** AskUser, **no** Agent/subagent, **no** plan mode — work autonomously.
- End the **final turn** (no further tools) with user-visible delivery: start visible text with `[交付]`, then the **full** markdown report (## headings, tables, bullet lists as needed). Do not shorten to a one-line summary.
- Intermediate turns may use short visible progress notes (no prefix required; merged into reasoning stream); only the final `[交付]` must be complete."""


def build_subagent_run_context_human(
    ctx: AgentRunContext,
    transcript: Any,
) -> str:
    from app.agent.harness.message_history import build_run_context_human

    base = build_run_context_human(ctx, transcript)
    desc = str((ctx.context_patch or {}).get(_PATCH_DESCRIPTION) or "").strip()
    prefix = f"【子任务】{desc}\n\n" if desc else ""
    return (
        f"{prefix}{base}\n\n"
        "你是子 Agent：只完成上述子任务，分批执行；最后一轮用 `[交付]` 输出完整 Markdown 汇报（供主 Agent 与用户查看）。"
    )


def _extract_subagent_delivery_text(
    events: list[dict[str, Any]],
    *,
    streamed_delivery: str = "",
) -> str:
    """Full user-visible delivery from streamed message.delta / message.completed."""
    from app.agent.harness.visible_text_channel import classify_visible_channel_prefix

    if streamed_delivery.strip():
        _, body = classify_visible_channel_prefix(streamed_delivery.strip())
        return (body or streamed_delivery).strip()

    final_message = ""
    for ev in events:
        if not isinstance(ev, dict):
            continue
        et = str(ev.get("type") or "")
        payload = ev.get("payload") if isinstance(ev.get("payload"), dict) else {}
        if et == "message.completed":
            content = str(payload.get("content") or "").strip()
            if content:
                final_message = content
        elif et == "message.delta":
            piece = str(payload.get("text") or payload.get("content") or "")
            if piece:
                final_message = (final_message + piece)[-120_000:]

    if not final_message.strip():
        return ""

    _, body = classify_visible_channel_prefix(final_message.strip())
    return (body or final_message).strip()


def _summarize_subagent_events(
    description: str,
    events: list[dict[str, Any]],
) -> tuple[str, bool]:
    """Build model-facing subagent result from collected SSE events."""
    tool_lines: list[str] = []
    final_message = ""
    error = ""

    for ev in events:
        if not isinstance(ev, dict):
            continue
        et = str(ev.get("type") or "")
        payload = ev.get("payload") if isinstance(ev.get("payload"), dict) else {}
        if et == "step.completed":
            tool = str(payload.get("tool") or "").strip()
            if not tool or tool in ("think",):
                continue
            title = str(payload.get("title") or tool).strip()
            excerpt = str(
                payload.get("display_excerpt")
                or payload.get("output_summary")
                or payload.get("reason")
                or ""
            ).strip()
            if excerpt:
                tool_lines.append(f"- **{title}**: {excerpt[:480]}")
        elif et == "message.completed":
            content = str(payload.get("content") or "").strip()
            if content:
                final_message = content
        elif et == "message.delta":
            piece = str(payload.get("text") or payload.get("content") or "")
            if piece:
                final_message = (final_message + piece)[-8000:]
        elif et in ("planning.failed", "run.failed"):
            err = str(payload.get("error") or "").strip()
            if err:
                error = err

    parts: list[str] = [f"## 子任务完成：{description or '子任务'}"]
    if error:
        parts.append(f"\n**状态**：失败 — {error}")
    else:
        parts.append("\n**状态**：已完成（子 Agent run）")
    if final_message:
        parts.append(f"\n### 摘要\n{final_message}")
    if tool_lines:
        parts.append("\n### 执行记录\n" + "\n".join(tool_lines[-14:]))
    if not final_message and not tool_lines and not error:
        parts.append("\n（子 Agent 未产生可见输出，请主 Agent 用 Read 核对目标路径。）")

    from app.agent.tools.result_storage import truncate_tool_result

    text = "\n".join(parts).strip()
    is_error = bool(error) and not tool_lines and not final_message
    return truncate_tool_result(text, max_chars=12_000), is_error


async def run_subagent(
    parent: AgentRunContext,
    *,
    description: str,
    prompt: str,
) -> ToolCallResult:
    """Execute delegated work via nested query_loop; blocks until sub-run ends."""
    if subagent_depth(parent) >= settings.agent_subagent_max_depth:
        return ToolCallResult(
            content=(
                "<tool_use_error>已在子 Agent 内，禁止嵌套 Agent。"
                "请在本层用工具分批完成，或让主 Agent 拆分后重新派发。</tool_use_error>"
            ),
            is_error=True,
        )

    task_prompt = (prompt or "").strip()
    if not task_prompt:
        return ToolCallResult(
            content="<tool_use_error>Agent 工具需要非空 prompt（子任务说明）。</tool_use_error>",
            is_error=True,
        )

    child = build_subagent_context(
        parent, description=(description or "子任务").strip(), prompt=task_prompt
    )
    logger.info(
        "subagent start parent=%s child=%s desc=%s",
        parent.run_id,
        child.run_id,
        (description or "")[:80],
    )

    from app.agent.loop import run_query_loop

    collected: list[dict[str, Any]] = []
    async for event in run_query_loop(RunRequest(context=child)):
        if isinstance(event, dict):
            collected.append(event)

    summary, is_error = _summarize_subagent_events(description, collected)
    patch = {
        "last_subagent": {
            "parent_run_id": parent.run_id,
            "child_run_id": child.run_id,
            "description": (description or "")[:200],
            "ok": not is_error,
        }
    }
    logger.info(
        "subagent done parent=%s child=%s ok=%s chars=%s",
        parent.run_id,
        child.run_id,
        not is_error,
        len(summary),
    )
    return ToolCallResult(content=summary, is_error=is_error, context_patch=patch)
