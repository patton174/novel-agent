"""Tool-layer modular prompt assembly."""

from __future__ import annotations

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

from app.agent.context.prompting.blocks import coerce_text_snippet, join_human_blocks, json_block
from app.agent.context.prompting.fragments import (
    THINK_INTENSITY_SPEC,
    build_ask_user_task_text,
    build_chapter_task_text,
    build_choose_task_text,
    build_output_delivery_hint,
    build_think_system_text,
    build_think_task_text,
)
from app.agent.context.prompting.run_context import format_run_context_block
from app.agent.context.prompting.tool_contracts import (
    STEP_SUBMIT_SYSTEM,
    ask_user_questions_system_lines,
    ask_user_structured_system_lines,
    chapter_stream_system_lines,
    choose_structured_system_lines,
    output_stream_system_lines,
    step_json_rules,
)
from app.agent.context.prompting.types import ToolPromptMode, ToolPromptRequest
from app.agent.harness.routing import story_context_from_ctx
from app.agent.schemas import AgentRunContext
from app.core.llm_cache import cached_system_message
from app.runtime.text_sanitize import extract_visible_text


def _background_from_ctx(
    ctx: AgentRunContext, tool_input: dict
) -> str:
    return str(tool_input.get("context") or story_context_from_ctx(ctx) or "")


def _append_memory_read_snippet(parts: list[str], last: dict) -> None:
    if not isinstance(last, dict) or not last.get("ok"):
        return
    memory_id = str(last.get("memory_id") or "").strip()
    scope = str(last.get("scope") or "")
    if memory_id:
        line = f"已 ReadMemory memory_id={memory_id}"
        if scope:
            line += f" scope={scope}"
        parts.append(line)
        return
    if scope == "character":
        ids = last.get("item_ids") or []
        if ids:
            parts.append(
                f"角色库共 {last.get('count') or len(ids)} 人："
                + ", ".join(str(x) for x in ids)
            )
        previews = last.get("previews")
        if isinstance(previews, dict):
            for name, preview in previews.items():
                parts.append(f"- {name}: {preview}")
    elif last.get("value_preview"):
        key = last.get("key") or last.get("item_id") or scope
        parts.append(f"{scope} · {key}：{last['value_preview']}")


def _format_memory_for_output(ctx: AgentRunContext, tool_input: dict) -> str:
    patch = ctx.context_patch if isinstance(ctx.context_patch, dict) else {}
    parts: list[str] = []
    snippet = coerce_text_snippet(tool_input.get("context"))
    if snippet:
        parts.append(snippet)
    last = patch.get("last_memory_read")
    if isinstance(last, dict):
        _append_memory_read_snippet(parts, last)
    roster = patch.get("character_roster")
    if isinstance(roster, list) and roster and not any("角色库" in p for p in parts):
        parts.append("角色库：" + ", ".join(str(x) for x in roster))
    tool_memory = tool_input.get("memory_context")
    if isinstance(tool_memory, dict) and tool_memory.get("ok"):
        before = len(parts)
        _append_memory_read_snippet(parts, tool_memory)
        if len(parts) == before:
            pass
    tool_roster = tool_input.get("character_roster")
    if isinstance(tool_roster, list) and tool_roster:
        roster_line = "角色库：" + ", ".join(str(x) for x in tool_roster)
        if roster_line not in parts:
            parts.append(roster_line)
    return "\n\n".join(parts) if parts else "（无额外上下文）"


def build_tool_human(
    req: ToolPromptRequest,
    *,
    task_text: str,
    extra_blocks: list[str] | None = None,
) -> str:
    blocks: list[str] = []
    if req.include_run_context:
        blocks.append(
            format_run_context_block(
                req.ctx,
                tool_input=req.tool_input,
                include_think_summary=req.include_think_summary,
            )
        )
    blocks.append(f"TOOL_TASK:\n{task_text.strip()}")
    retry = req.tool_input.get("_tool_retry") if isinstance(req.tool_input, dict) else None
    if isinstance(retry, dict) and retry.get("error_detail"):
        blocks.append(
            json_block(
                "TOOL_RETRY_JSON",
                {
                    "attempt": retry.get("attempt"),
                    "error_code": retry.get("error_code"),
                    "error_detail": retry.get("error_detail"),
                    "instruction": (
                        "上次工具执行失败。请根据错误修正参数或输出，"
                        "在同一工具职责内重试（勿改路由）。"
                    ),
                },
            )
        )
    if extra_blocks:
        blocks.extend(extra_blocks)
    return join_human_blocks(*blocks)


def build_tool_messages(request: ToolPromptRequest) -> list[BaseMessage]:
    name = request.tool_name
    ctx = request.ctx
    inp = request.tool_input
    mode = request.mode

    if mode == ToolPromptMode.SUBMIT:
        return build_step_submit_messages(
            tool_name=name,
            extra_system=request.extra_system,
            visible_markdown=request.visible_markdown,
        )

    if name == "think" and mode == ToolPromptMode.STREAM:
        return build_think_stream_messages(ctx, inp)

    if name == "output" and mode == ToolPromptMode.STREAM:
        return build_output_stream_messages(ctx, inp)

    if name in ("chapter_create", "chapter_update") and mode == ToolPromptMode.STREAM:
        return build_chapter_stream_messages(ctx, inp)

    if name == "choose":
        topic = str(inp.get("topic") or ctx.user_message)
        bg = _background_from_ctx(ctx, inp)
        human = build_tool_human(
            request,
            task_text=build_choose_task_text(ctx.mode, topic, bg),
        )
        if mode == ToolPromptMode.PLAIN:
            system = "\n".join(
                [
                    "你是小说创作顾问。只输出中文创作方向选项，严格使用用户要求的格式。",
                    "不要 JSON、不要代码块、不要解释。",
                ]
            )
            return [SystemMessage(content=system), HumanMessage(content=human)]
        return [
            SystemMessage(content="\n".join(choose_structured_system_lines())),
            HumanMessage(content=human),
        ]

    if name == "ask_user":
        if mode == ToolPromptMode.ASK_USER_QUESTIONS:
            return build_ask_user_questions_messages(ctx, inp)
        topic = str(inp.get("topic") or ctx.user_message)
        bg = _background_from_ctx(ctx, inp)
        human = build_tool_human(
            request,
            task_text=build_ask_user_task_text(ctx.mode, topic, bg),
        )
        return [
            SystemMessage(content="\n".join(ask_user_structured_system_lines())),
            HumanMessage(content=human),
        ]

    if mode == ToolPromptMode.STRUCTURED:
        human = build_tool_human(
            request,
            task_text=str(inp.get("task") or ctx.user_message),
        )
        return [
            SystemMessage(content=step_json_rules()),
            HumanMessage(content=human),
        ]

    human = build_tool_human(
        request,
        task_text=str(inp.get("task") or ctx.user_message),
    )
    return [HumanMessage(content=human)]


def build_think_stream_messages(
    ctx: AgentRunContext, tool_input: dict
) -> list[BaseMessage]:
    intensity = str((ctx.preferences or {}).get("think_intensity") or "medium")
    if intensity not in THINK_INTENSITY_SPEC:
        intensity = "medium"
    question = str(tool_input.get("question") or ctx.user_message)
    context = tool_input.get("context") or story_context_from_ctx(ctx) or None
    task = build_think_task_text(
        question, context, mode=ctx.mode, intensity=intensity
    )
    req = ToolPromptRequest(
        tool_name="think",
        ctx=ctx,
        tool_input=tool_input,
        mode=ToolPromptMode.STREAM,
    )
    human = build_tool_human(req, task_text=task)
    return [
        cached_system_message(build_think_system_text(intensity)),
        HumanMessage(content=human),
    ]


def build_output_stream_messages(
    ctx: AgentRunContext, tool_input: dict
) -> list[BaseMessage]:
    from app.agent.context.prompting.output_input import normalize_output_input

    norm_input = normalize_output_input(tool_input)
    delivery_hint = build_output_delivery_hint(norm_input)
    task = str(norm_input.get("task") or tool_input.get("task") or ctx.user_message)
    memory_block = f"MEMORY_SNIPPET:\n{_format_memory_for_output(ctx, tool_input)}"
    req = ToolPromptRequest(
        tool_name="output",
        ctx=ctx,
        tool_input=tool_input,
        mode=ToolPromptMode.STREAM,
        include_think_summary=True,
    )
    human = build_tool_human(
        req,
        task_text=f"任务：{task}\n\n{delivery_hint}".strip(),
        extra_blocks=[memory_block] if memory_block else None,
    )
    return [
        cached_system_message("\n".join(output_stream_system_lines())),
        HumanMessage(content=human),
    ]


def build_ask_user_questions_messages(
    ctx: AgentRunContext, tool_input: dict
) -> list[BaseMessage]:
    """Forced AskUserQuestionsOutput — Run context + task, no StepResult rules."""
    topic = str(tool_input.get("topic") or ctx.user_message)
    bg = _background_from_ctx(ctx, tool_input)
    req = ToolPromptRequest(
        tool_name="ask_user",
        ctx=ctx,
        tool_input=tool_input,
        mode=ToolPromptMode.ASK_USER_QUESTIONS,
    )
    human = build_tool_human(
        req,
        task_text=build_ask_user_task_text(ctx.mode, topic, bg),
    )
    return [
        SystemMessage(content="\n".join(ask_user_questions_system_lines())),
        HumanMessage(content=human),
    ]


def build_chapter_stream_messages(
    ctx: AgentRunContext, tool_input: dict
) -> list[BaseMessage]:
    task = str(tool_input.get("task") or ctx.user_message or "").strip()
    word_count = int(tool_input.get("word_count") or 800)
    background = _background_from_ctx(ctx, tool_input)
    if ctx.selected_choice:
        title = str(ctx.selected_choice.get("title") or "").strip()
        if title:
            task = f"{task}\n用户选择的方向：{title}"
    task_body = build_chapter_task_text(ctx.mode, task, background, word_count)
    req = ToolPromptRequest(
        tool_name="chapter_create",
        ctx=ctx,
        tool_input=tool_input,
        mode=ToolPromptMode.STREAM,
    )
    human = build_tool_human(req, task_text=task_body)
    return [
        SystemMessage(content="\n".join(chapter_stream_system_lines())),
        HumanMessage(content=human),
    ]


def build_step_submit_messages(
    *,
    tool_name: str,
    extra_system: str,
    visible_markdown: str,
    human_hint: str = "请提交 StepResult。",
) -> list[BaseMessage]:
    body = extract_visible_text(visible_markdown or "").strip()
    human = human_hint
    if body:
        human = f"{human_hint}\n\n已输出正文（节选）：\n{body[:4000]}"
    return [
        SystemMessage(content=f"{STEP_SUBMIT_SYSTEM}\n{extra_system}"),
        HumanMessage(content=human),
    ]


def output_submit_messages(
    ctx: AgentRunContext,
    tool_input: dict,
    visible_markdown: str,
) -> list[BaseMessage]:
    """StepResult routing after output stream — end_run hint drives action."""
    from app.agent.context.prompting.output_input import normalize_output_input

    _ = ctx
    tool_input = normalize_output_input(tool_input)
    end_run = tool_input.get("end_run")
    if end_run is True:
        routing = (
            "step_kind=output，action=end，next_tool=end，reason 含 output ok。"
        )
    elif end_run is False:
        routing = (
            "step_kind=output，action=continue，next_tool 留空，"
            "reason 含 output continue。"
        )
    else:
        routing = (
            "step_kind=output；根据正文是否已完整回复用户，"
            "选择 action=end 或 continue。"
        )
    return build_step_submit_messages(
        tool_name="output",
        extra_system=routing,
        visible_markdown=visible_markdown,
        human_hint="用户可见回复已流式输出，请提交 StepResult 路由元数据。",
    )


def think_submit_messages(
    ctx: AgentRunContext,
    tool_input: dict,
    visible_markdown: str,
) -> list[BaseMessage]:
    _ = ctx, tool_input
    return build_step_submit_messages(
        tool_name="think",
        extra_system=(
            "step_kind=think，action=continue，next_tool 留空，next_input={}。"
            "context_patch.think_summary 为简体中文摘要（≤800 字）。"
            "仅当明确应结束本轮时 action=end、next_tool=end。"
        ),
        visible_markdown=visible_markdown,
        human_hint="思考分析已通过流式通道展示，请提交 StepResult 元数据。",
    )
