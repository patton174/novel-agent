"""LLM-generated chat session titles."""

from __future__ import annotations

import logging
import re
from datetime import datetime

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.core.llm import llm_provider

logger = logging.getLogger(__name__)

_TITLE_MAX_LEN = 24

_GENERIC_USER = frozenset(
    {"继续", "继续写", "继续优化", "好", "好的", "嗯", "是的", "ok", "OK"}
)

_BOILERPLATE_SNIPPET_RE = [
    re.compile(r"我整理好了上下文"),
    re.compile(r"没有生成可展示正文"),
    re.compile(r"请给我一句更明确的续写指令"),
    re.compile(r"^Read:\s*#", re.I),
    re.compile(r"^\{'signature'"),
    re.compile(r"^\*\*删除完成"),
]

_BOILERPLATE_TITLE_RE = [
    re.compile(r"^我整理好了上下文"),
    re.compile(r"^Read:\s*#", re.I),
    re.compile(r"^\{'signature'"),
    re.compile(r"^\*\*删除完成"),
]


class SessionTitleRequest(BaseModel):
    user_message: str = Field(min_length=1, max_length=2000)
    assistant_snippet: str = Field(default="", max_length=800)
    novel_title: str = Field(default="", max_length=200)


class SessionTitleResponse(BaseModel):
    title: str


def _normalize_title(raw: str, fallback: str) -> str:
    text = re.sub(r"[\r\n\t]+", " ", (raw or "").strip())
    text = re.sub(r"\s+", " ", text)
    text = text.strip("\"'“”‘’「」[]【】()（）")
    if not text:
        return fallback
    if _is_boilerplate_title(text):
        return fallback
    if len(text) > _TITLE_MAX_LEN:
        return text[:_TITLE_MAX_LEN].rstrip() + "…"
    return text


def _is_boilerplate_title(text: str) -> bool:
    return any(pat.search(text) for pat in _BOILERPLATE_TITLE_RE)


def _sanitize_snippet(snippet: str) -> str:
    t = snippet.strip()
    if not t:
        return ""
    if any(pat.search(t) for pat in _BOILERPLATE_SNIPPET_RE):
        return ""
    if t.startswith("Read:") or t.startswith("{'signature"):
        return ""
    return t[:400]


def _is_generic_user_message(user_message: str) -> bool:
    clean = re.sub(r"\s+", " ", user_message.strip())
    if not clean:
        return True
    if clean in _GENERIC_USER:
        return True
    if len(clean) <= 4 and not re.search(r"[章节第\d]", clean):
        return True
    return False


def _fallback_title(user_message: str, novel_title: str = "") -> str:
    clean = re.sub(r"\s+", " ", user_message.strip())
    novel = (novel_title or "").strip()
    if _is_generic_user_message(clean):
        novel_short = novel[:12] + "…" if len(novel) > 12 else novel
        if novel_short:
            if clean and clean not in _GENERIC_USER:
                base = f"{clean} · {novel_short}"
            else:
                base = f"续写 · {novel_short}"
            return base[: _TITLE_MAX_LEN - 1] + "…" if len(base) > _TITLE_MAX_LEN else base
        now = datetime.now()
        stamp = f"{now.month}/{now.day} {now.hour:02d}:{now.minute:02d}"
        return f"新对话 {stamp}"
    if not clean:
        return "新对话"
    if len(clean) > 18:
        return clean[:18] + "…"
    return clean


async def generate_session_title(req: SessionTitleRequest) -> SessionTitleResponse:
    novel = (req.novel_title or "").strip()
    fallback = _fallback_title(req.user_message, novel)
    if not llm_provider.is_configured:
        return SessionTitleResponse(title=fallback)

    snippet = _sanitize_snippet(req.assistant_snippet or "")
    user = req.user_message.strip()[:500]

    system = SystemMessage(
        content=(
            "你是小说创作助手的会话命名器。根据用户首条指令（必要时参考助手摘要或书名），"
            f"生成一条中文会话标题，不超过{_TITLE_MAX_LEN}个字。"
            "要求：概括具体创作任务（如章节、角色、校对），不要引号、不要句号、"
            "不要「对话」「会话」等元词，不要用系统报错、工具日志、固定提示语当标题。"
            "用户只说「继续」时，结合书名写如「续写·XXX」而非照抄「继续」。"
            "只输出标题本身。"
        )
    )
    human_parts = [f"用户：{user}"]
    if snippet:
        human_parts.append(f"助手摘要：{snippet}")
    if novel:
        human_parts.append(f"书名：{novel}")
    human = HumanMessage(content="\n".join(human_parts))

    try:
        llm = llm_provider.get_llm(profile="fast")
        result = await llm.ainvoke([system, human])
        raw = result.content if isinstance(result.content, str) else str(result.content)
        return SessionTitleResponse(title=_normalize_title(raw, fallback))
    except Exception:
        logger.exception("session title generation failed")
        return SessionTitleResponse(title=fallback)
