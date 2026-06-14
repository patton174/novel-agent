"""LLM-assisted novel synopsis / setting text for create-novel flow."""

from __future__ import annotations

import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.core.llm import llm_provider

logger = logging.getLogger(__name__)

_MAX_LEN = 1200


class NovelDescriptionRequest(BaseModel):
    title: str = Field(default="", max_length=200)
    genre: str = Field(default="", max_length=100)
    style: str = Field(default="", max_length=100)
    draft: str = Field(default="", max_length=2000)


class NovelDescriptionResponse(BaseModel):
    description: str


def _fallback_description(req: NovelDescriptionRequest) -> str:
    title = req.title.strip() or "未命名作品"
    genre = req.genre.strip() or "玄幻"
    style = req.style.strip() or "爽文"
    return (
        f"《{title}》是一部{genre}题材、{style}风格的长篇。"
        "主角在异变的世界中踏上成长之路，围绕核心冲突展开冒险，"
        "世界观强调力量体系与人物羁绊，适合连载扩写。"
    )


def _normalize(text: str, fallback: str) -> str:
    cleaned = re.sub(r"[\r\n\t]+", "\n", (text or "").strip())
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    if not cleaned:
        return fallback
    if len(cleaned) > _MAX_LEN:
        return cleaned[:_MAX_LEN].rstrip()
    return cleaned


async def suggest_novel_description(req: NovelDescriptionRequest) -> NovelDescriptionResponse:
    draft = (req.draft or "").strip()
    fallback = _normalize(draft, _fallback_description(req)) if draft else _fallback_description(req)

    if not llm_provider.is_configured:
        return NovelDescriptionResponse(description=fallback)

    if draft:
        system = SystemMessage(
            content=(
                "你是中文网文策划编辑。根据用户提供的书名、类型、风格与草稿，"
                "润色并扩写「简介/设定」：包含世界观要点、主角处境、核心冲突与连载钩子。"
                "使用简体中文，2–4 段，总字数 120–280 字，不要列表编号，不要 markdown。"
            )
        )
        human = HumanMessage(
            content="\n".join(
                [
                    f"书名：{req.title or '—'}",
                    f"类型：{req.genre or '—'}",
                    f"风格：{req.style or '—'}",
                    f"用户草稿：\n{draft}",
                ]
            )
        )
    else:
        system = SystemMessage(
            content=(
                "你是中文网文策划编辑。根据书名、类型、风格生成「简介/设定」："
                "世界观、主角、核心冲突、连载方向。简体中文，2–4 段，120–280 字，"
                "不要列表编号，不要 markdown。"
            )
        )
        human = HumanMessage(
            content="\n".join(
                [
                    f"书名：{req.title or '未命名'}",
                    f"类型：{req.genre or '玄幻'}",
                    f"风格：{req.style or '爽文'}",
                ]
            )
        )

    try:
        llm = llm_provider.get_llm(profile="fast")
        result = await llm.ainvoke([system, human])
        raw = result.content if isinstance(result.content, str) else str(result.content)
        return NovelDescriptionResponse(description=_normalize(raw, fallback))
    except Exception:
        logger.exception("novel description generation failed")
        return NovelDescriptionResponse(description=fallback)
