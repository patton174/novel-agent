"""Heuristics for when the agent should ask the user before writing."""

from __future__ import annotations

from app.agent_step.context_compact import (
    compact_story_memory_text,
    ctx_with_write_anchor,
    format_chapter_window,
    is_onboarding_assistant_text,
    previous_chapter_tail_for_create,
)
from app.agent_step.schemas import AgentRunContext

_CONTINUE_INTENT_TOKENS = (
    "继续",
    "接着写",
    "续写",
    "接着来",
    "刚刚中断",
    "中断了",
    "被中断",
    "继续写",
    "接着续",
)

_INCOMPLETE_ENDINGS = (
    "的",
    "了",
    "和",
    "与",
    "或",
    "要",
    "想",
    "写",
    "一篇",
    "一个",
    "一种",
    "类型",
)

_SPECIFICITY_HINTS = (
    "主角",
    "场景",
    "冲突",
    "字数",
    "第一章",
    "开篇",
    "续写",
    "公会",
    "副本",
)


def project_summary_from_ctx(ctx: AgentRunContext) -> str:
    """当前小说的轻量元数据摘要，供 LLM 阅读；不含章节正文与检索结果。"""
    project = ctx.project or {}
    parts: list[str] = []
    if project.get("title"):
        parts.append(f"书名：《{project.get('title')}》")
    if project.get("genre"):
        parts.append(f"类型：{project.get('genre')}")
    if project.get("style"):
        parts.append(f"风格：{project.get('style')}")
    if project.get("description"):
        parts.append(f"简介/设定：{project.get('description')}")
    target = project.get("target_chapter_words")
    if target:
        parts.append(f"目标章节字数：{target}")
    return "\n".join(parts)


def has_writing_context(ctx: AgentRunContext) -> bool:
    from app.agent_step.context_compact import chapter_has_substantial_body

    for ch in ctx.chapters or []:
        if isinstance(ch, dict) and chapter_has_substantial_body(ch):
            return True
    for turn in ctx.history or []:
        if turn.get("role") != "assistant":
            continue
        content = (turn.get("content") or "").strip()
        if content and not is_onboarding_assistant_text(content):
            return True
    return False


def format_dialogue_history(
    ctx: AgentRunContext,
    *,
    max_turns: int = 24,
    max_len: int = 3500,
    transcript: list[dict[str, Any]] | None = None,
) -> str:
    """Recent user/assistant turns plus in-run ask_user/choose confirmations."""
    lines: list[str] = []
    has_run_interaction = False
    if isinstance(transcript, list):
        has_run_interaction = any(
            isinstance(row, dict) and row.get("kind") == "interaction" for row in transcript
        )
    patch = ctx.context_patch if isinstance(ctx.context_patch, dict) else {}
    if has_run_interaction:
        interactions = patch.get("user_interactions")
        if isinstance(interactions, list):
            for item in interactions:
                if not isinstance(item, dict):
                    continue
                text = str(item.get("text") or "").strip()
                if text:
                    lines.append(f"用户（交互确认）：{text}")
        if ctx.selected_choice:
            title = str(ctx.selected_choice.get("title") or "").strip()
            desc = str(ctx.selected_choice.get("description") or "").strip()
            choice_line = title
            if desc and desc not in title:
                choice_line = f"{title}（{desc}）"
            if choice_line and not any(choice_line in line for line in lines):
                lines.append(f"用户（本轮选择）：{choice_line}")
    for turn in (ctx.history or [])[-max_turns:]:
        role = str(turn.get("role") or "").strip()
        content = str(turn.get("content") or "").strip()
        if not content:
            continue
        if role == "user" and content.startswith("我的回答："):
            continue
        label = "用户" if role == "user" else "助手"
        lines.append(f"{label}：{content[:1200]}")
    return "\n".join(lines)[:max_len]


def story_context_for_chapter_create(ctx: AgentRunContext, *, max_len: int = 4000) -> str:
    """写新章用上下文：章节窗口锚定最新章 + 上一章末尾，不含整章正文。"""
    anchored = ctx_with_write_anchor(ctx)
    parts: list[str] = []
    project_block = project_summary_from_ctx(anchored)
    if project_block:
        parts.append(project_block)

    chapter_window = format_chapter_window(anchored)
    if chapter_window:
        parts.append(chapter_window)

    memory = compact_story_memory_text(str(anchored.story_memory or ""), max_len=800)
    if memory:
        parts.append(f"设定记忆（摘要）：\n{memory}")

    dialogue = format_dialogue_history(anchored, max_len=min(max_len, 2000))
    if dialogue:
        parts.append(f"近期对话与确认：\n{dialogue}")

    patch = anchored.context_patch if isinstance(anchored.context_patch, dict) else {}
    retrieved = patch.get("retrieved_context")
    if isinstance(retrieved, str) and retrieved.strip():
        parts.append(f"检索上下文：\n{retrieved[:800]}")

    tail = previous_chapter_tail_for_create(anchored)
    if tail:
        parts.append(f"上一章末尾（衔接参考）：\n{tail}")
    return "\n".join(parts)[:max_len]


def story_context_from_ctx(ctx: AgentRunContext, *, max_len: int = 4000) -> str:
    """组装 LLM 可读上下文：项目元数据 + 精简记忆 + 章节窗口 + 当前章正文。"""
    parts: list[str] = []
    project_block = project_summary_from_ctx(ctx)
    if project_block:
        parts.append(project_block)

    chapter_window = format_chapter_window(ctx)
    if chapter_window:
        parts.append(chapter_window)

    memory = compact_story_memory_text(str(ctx.story_memory or ""), max_len=800)
    if memory:
        parts.append(f"设定记忆（摘要）：\n{memory}")

    dialogue = format_dialogue_history(ctx, max_len=min(max_len, 2000))
    if dialogue:
        parts.append(f"近期对话与确认：\n{dialogue}")

    patch = ctx.context_patch if isinstance(ctx.context_patch, dict) else {}
    retrieved = patch.get("retrieved_context")
    if isinstance(retrieved, str) and retrieved.strip():
        parts.append(f"检索上下文：\n{retrieved[:800]}")

    return "\n".join(parts)[:max_len]


_SEARCH_HINTS = (
    "之前",
    "上文",
    "前面",
    "哪一章",
    "还记得",
    "设定",
    "伏笔",
    "检索",
    "搜索",
    "查找",
)


def needs_context_search(ctx: AgentRunContext) -> bool:
    msg = (ctx.user_message or "").strip()
    if not msg:
        return False
    return any(h in msg for h in _SEARCH_HINTS)


def is_continue_request(ctx: AgentRunContext) -> bool:
    msg = (ctx.user_message or "").strip()
    if not msg or not has_writing_context(ctx):
        return False
    return any(token in msg for token in _CONTINUE_INTENT_TOKENS)


def needs_user_direction(ctx: AgentRunContext) -> bool:
    """True when there is no chapter text and the request is too vague to write."""
    if is_continue_request(ctx):
        return False
    if has_writing_context(ctx):
        return False
    msg = (ctx.user_message or "").strip()
    if not msg:
        return True
    if len(msg) < 18:
        return True
    if any(msg.endswith(suffix) for suffix in _INCOMPLETE_ENDINGS):
        return True
    if len(msg) < 48 and not any(hint in msg for hint in _SPECIFICITY_HINTS):
        return True
    return False
