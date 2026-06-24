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
    from app.agent.harness.visible_text_channel import visible_text_prompt_block

    names = ", ".join(
        sorted(t.name for t in get_all_tools() if t.name not in SUBAGENT_EXCLUDED_TOOLS)
    )
    max_turns = settings.agent_subagent_max_turns
    channel_block = visible_text_prompt_block()
    return f"""You are a **sub-agent** for a novel-writing task. The parent agent delegated one focused slice.

Available tools: {names}

{channel_block}

Rules:
- Complete **only** the delegated task in the user message. Do not expand scope.
- **Batch size**: at most 3–4 chapters (or 3–4 memory writes) per turn; use multiple turns if needed (max ~{max_turns} turns).
- Use RUN_CONTEXT `novel.chapter_catalog` / `memory.memory_index` for UUIDs.
- Glob/Grep are paths only → must Read for bodies. Do not call removed tools.
- **No** AskUser, **no** Agent/subagent, **no** plan mode — work autonomously."""


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
        "你是子 Agent：只完成上述子任务，分批执行。"
        "最后一轮无工具时写完整 Markdown 回复。"
    )


def _polish_visible_output(text: str) -> str:
    from app.agent.harness.visible_text_channel import polish_visible_text

    raw = (text or "").strip()
    return polish_visible_text(raw) if raw else ""


def _extract_subagent_visible_text(
    events: list[dict[str, Any]],
    *,
    final_turn_text: str = "",
) -> str:
    """Last user-visible assistant text from the subagent run."""
    if final_turn_text.strip():
        return _polish_visible_output(final_turn_text)

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

    return _polish_visible_output(final_message)


def _summarize_subagent_events(
    description: str,
    events: list[dict[str, Any]],
    *,
    delivery_text: str = "",
) -> tuple[str, bool]:
    """Build model-facing subagent ToolMessage — CC finalizeAgentTool text blocks."""
    tool_lines: list[str] = []
    error = ""

    for ev in events:
        if not isinstance(ev, dict):
            continue
        et = str(ev.get("type") or "")
        payload = ev.get("payload") if isinstance(ev.get("payload"), dict) else {}
        if et == "step.completed":
            tool = str(payload.get("tool") or payload.get("step_kind") or "").strip()
            if not tool or tool in ("think", "Agent"):
                continue
            title = str(payload.get("title") or tool).strip()
            display = payload.get("display")
            display_content = ""
            if isinstance(display, dict):
                dc = display.get("content")
                if isinstance(dc, str) and dc.strip():
                    display_content = dc.strip()
            excerpt = str(
                payload.get("display_excerpt")
                or payload.get("output_summary")
                or display_content
                or payload.get("reason")
                or ""
            ).strip()
            if excerpt:
                tool_lines.append(f"- **{title}**: {excerpt[:480]}")
        elif et in ("planning.failed", "run.failed"):
            err = str(payload.get("error") or "").strip()
            if err:
                error = err

    visible = (delivery_text or "").strip()
    if not visible:
        visible = _extract_subagent_visible_text(events)

    parts: list[str] = [f"子任务「{description or '子任务'}」已完成。"]
    if error and visible:
        parts.append("\n**状态**：已完成（子 Agent run）")
        warn = error.strip()
        if "<tool_use_error" in warn:
            import re

            m = re.search(r"<tool_use_error[^>]*>([^<]+)</tool_use_error>", warn)
            warn = (m.group(1) if m else warn)[:320]
        elif len(warn) > 320:
            warn = warn[:320] + "…"
        if warn:
            parts.append(f"\n**警告**（部分工具曾失败）：{warn}")
    elif error:
        parts.append(f"\n**状态**：失败 — {error}")
    else:
        parts.append("\n**状态**：已完成（子 Agent run）")
    if visible:
        parts.append("\n**回复正文**（子 Agent 最后一轮可见 text，供主 Agent 继续处理）：")
        parts.append(visible)
    elif tool_lines:
        parts.append("\n**执行记录**（无可见回复正文）：")
        parts.append("\n".join(tool_lines[-14:]))
    elif not error:
        parts.append("\n（子 Agent 未产生可见输出，请主 Agent 用 Read 核对目标路径。）")
    if tool_lines and visible:
        parts.append("\n**工具摘录**：")
        parts.append("\n".join(tool_lines[-6:]))

    from app.agent.tools.result_storage import MAX_DEFAULT_CHARS, truncate_tool_result

    text = "\n".join(parts).strip()
    is_error = bool(error) and not visible and not tool_lines
    return truncate_tool_result(text, max_chars=MAX_DEFAULT_CHARS), is_error


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
    patch: dict[str, Any] = {
        "last_subagent": {
            "parent_run_id": parent.run_id,
            "child_run_id": child.run_id,
            "description": (description or "")[:200],
            "ok": not is_error,
        }
    }
    # 子 Agent 可能写章/改序——结束后强制用 Content API 真值刷新父上下文 catalog，
    # 避免父 Agent 拿到陈旧 chapter_catalog 再写导致重复建章/错序。
    try:
        from app.agent.backend import chapter_client

        fresh = await chapter_client.fetch_chapter_summaries(parent)
        if fresh:
            patch["chapters"] = fresh
            patch["catalog_stale"] = False
    except Exception as exc:  # 刷新失败不阻塞交付，仅标记需重取
        logger.warning("subagent chapter refresh failed parent=%s: %s", parent.run_id, exc)
        patch["catalog_stale"] = True
    logger.info(
        "subagent done parent=%s child=%s ok=%s chars=%s",
        parent.run_id,
        child.run_id,
        not is_error,
        len(summary),
    )
    return ToolCallResult(content=summary, is_error=is_error, context_patch=patch)
