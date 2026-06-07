"""LLM-backed chapter body generation for chapter_create / chapter_update."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator

from langchain_core.messages import HumanMessage, SystemMessage

from app.agent.harness.llm_parse import _message_content, extract_json_object, normalize_step_result_dict
from app.agent.harness.routing import story_context_from_ctx
from app.agent.schemas import AgentRunContext, StepResult
from app.agent.streaming.stream_channels import LlmStreamPart
from app.agent.harness.structured_llm import try_invoke_structured
from app.agent.harness.structured_submit import visible_markdown_text
from app.agent.context.prompting.fragments import build_chapter_task_text
from app.agent.context.prompting.tool_prompt import build_chapter_stream_messages
from app.core.llm import llm_provider
from app.core.llm_chunk_split import LlmChunkSplitter
from app.core.llm_stream_policy import llm_policy_for_tool
from app.agent.harness.chapter_body_format import normalize_chapter_body_for_persist

logger = logging.getLogger(__name__)

_LLM_TIMEOUT_SEC = 180.0
_CHAPTER_STREAM_TOOL = "Write"
_CHAPTER_MIN_BODY_CHARS = 400
_TOOL_LEAK_MARKERS = (
    "<minimax:tool_call>",
    "<invoke ",
    "正在调用 chapter_",
)


def _chapter_body_rejection_reason(text: str) -> str | None:
    body = (text or "").strip()
    if not body:
        return "章节正文为空"
    lowered = body.lower()
    for marker in _TOOL_LEAK_MARKERS:
        if marker.lower() in lowered:
            return "正文中混入 tool_call/编排语句，请只输出小说正文"
    if len(body.replace("\n", "").replace(" ", "")) < _CHAPTER_MIN_BODY_CHARS:
        return f"章节正文过短（不足 {_CHAPTER_MIN_BODY_CHARS} 字），请写完整章节"
    return None


def normalize_chapter_body(text: str) -> str:
    return normalize_chapter_body_for_persist(text)


async def stream_chapter_body(
    ctx: AgentRunContext, tool_input: dict
) -> AsyncIterator[LlmStreamPart]:
    """Stream chapter prose as LlmStreamPart(channel=chapter)."""
    policy = llm_policy_for_tool(_CHAPTER_STREAM_TOOL)
    splitter = LlmChunkSplitter(emit_reasoning=policy.emit_model_reasoning)
    llm = llm_provider.get_llm(profile=policy.profile)
    messages = build_chapter_stream_messages(ctx, tool_input)
    try:
        async with asyncio.timeout(_LLM_TIMEOUT_SEC):
            async for chunk in llm.astream(messages):
                raw = getattr(chunk, "content", chunk)
                for kind, piece in splitter.feed(raw):
                    if not piece or kind != "text":
                        continue
                    clean = visible_markdown_text(piece)
                    if clean:
                        yield LlmStreamPart("chapter", clean)
    except Exception as exc:
        logger.warning("chapter body stream failed: %s", exc, exc_info=True)


async def generate_chapter_body(ctx: AgentRunContext, tool_input: dict) -> str:
    """Generate chapter prose; prefers streaming accumulation, falls back to structured."""
    direct = str(tool_input.get("content") or "").strip()
    if direct:
        return normalize_chapter_body(direct)

    if not llm_provider.is_configured:
        return normalize_chapter_body(str(ctx.user_message or "")[:2000])

    parts: list[str] = []
    async for part in stream_chapter_body(ctx, tool_input):
        parts.append(part.text)
    content = normalize_chapter_body("".join(parts))
    reject = _chapter_body_rejection_reason(content)
    if reject:
        logger.warning("chapter body rejected after stream: %s", reject)
        return ""
    if content.strip():
        return content

    task = str(tool_input.get("task") or ctx.user_message or "").strip()
    word_count = int(tool_input.get("word_count") or 800)
    background = str(
        tool_input.get("context") or story_context_from_ctx(ctx) or ""
    )
    if ctx.selected_choice:
        title = str(ctx.selected_choice.get("title") or "").strip()
        if title:
            task = f"{task}\n用户选择的方向：{title}"

    system_lines = [
        "通过 StepResult 工具提交（禁止手写 JSON/Markdown 外壳）。",
        "章节正文放在 context_patch.chapter_update.content。",
        "display.type=tool，display.content 为一句简体中文进度说明（勿放正文）。",
        "正文每个自然段首行缩进两个全角空格，段间空一行。",
        "完成后 action=continue，next_tool 留空。",
    ]
    messages = [
        SystemMessage(content="\n".join(system_lines)),
        HumanMessage(
            content=build_chapter_task_text(ctx.mode, task, background, word_count)
        ),
    ]
    try:
        structured = await try_invoke_structured(messages, StepResult)
        if structured is not None:
            patch = structured.context_patch if isinstance(structured.context_patch, dict) else {}
            update = patch.get("chapter_update") if isinstance(patch.get("chapter_update"), dict) else {}
            content = normalize_chapter_body(str(update.get("content") or structured.display.content or ""))
            if content.strip():
                return content
        llm = llm_provider.get_llm()
        raw = await llm.ainvoke(messages)
        data = normalize_step_result_dict(
            extract_json_object(_message_content(getattr(raw, "content", raw)))
        )
        result = StepResult.model_validate(data)
        patch = result.context_patch if isinstance(result.context_patch, dict) else {}
        update = patch.get("chapter_update") if isinstance(patch.get("chapter_update"), dict) else {}
        return normalize_chapter_body(str(update.get("content") or result.display.content or ""))
    except Exception as exc:
        logger.warning("chapter body LLM failed: %s", exc, exc_info=True)
        return ""
