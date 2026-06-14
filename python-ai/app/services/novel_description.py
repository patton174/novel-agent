"""LLM-assisted novel draft (Fanqie-style metadata + synopsis) for create-novel flow."""

from __future__ import annotations

import logging
import re
from typing import Literal

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.agent.harness.structured_llm import invoke_structured_with_retry
from app.core.llm import llm_provider

logger = logging.getLogger(__name__)

_SYNOPSIS_MAX = 600
_FIELD_MAX = {
    "title": 200,
    "genre": 40,
    "tags": 120,
    "style": 80,
    "hook": 30,
    "protagonist": 80,
    "worldview": 200,
    "selling_points": 120,
}


class NovelDescriptionRequest(BaseModel):
    title: str = Field(default="", max_length=200)
    genre: str = Field(default="", max_length=100)
    style: str = Field(default="", max_length=100)
    tags: str = Field(default="", max_length=200)
    hook: str = Field(default="", max_length=200)
    protagonist: str = Field(default="", max_length=200)
    worldview: str = Field(default="", max_length=500)
    synopsis: str = Field(default="", max_length=2000)
    selling_points: str = Field(default="", max_length=200)
    target_chapter_words: int | None = Field(default=None, ge=500, le=8000)
    draft: str = Field(default="", max_length=4000)
    mode: Literal["generate", "optimize"] = "generate"


class NovelDraftSuggestion(BaseModel):
    """Structured output — all create-novel form fields."""

    title: str = Field(description="书名，吸睛且符合题材")
    genre: str = Field(description="主分类：玄幻、都市、科幻、仙侠、悬疑、历史、游戏等")
    tags: str = Field(description="风格标签，空格分隔，如 爽文 单女主 系统 全民求生")
    style: str = Field(description="叙事风格，如 第三人称 快节奏 强钩子")
    hook: str = Field(description="一句话卖点，≤30字，适合番茄开屏")
    protagonist: str = Field(description="主角姓名+核心处境/金手指，≤80字")
    worldview: str = Field(description="世界观与力量体系要点，≤120字")
    synopsis: str = Field(description="书籍简介：2-4段，120-300字，含冲突与连载钩子，纯文本")
    selling_points: str = Field(description="核心卖点关键词，逗号分隔，3-6个")
    target_chapter_words: int = Field(
        description="建议每章字数，番茄常见 2000-3500",
        ge=1500,
        le=5000,
    )


class NovelDescriptionResponse(BaseModel):
    title: str = ""
    genre: str = ""
    tags: str = ""
    style: str = ""
    hook: str = ""
    protagonist: str = ""
    worldview: str = ""
    synopsis: str = ""
    selling_points: str = ""
    target_chapter_words: int = 3000
    description: str = ""


def _clip(text: str, max_len: int) -> str:
    cleaned = re.sub(r"[\r\n\t]+", "\n", (text or "").strip())
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    if len(cleaned) > max_len:
        return cleaned[:max_len].rstrip()
    return cleaned


def assemble_novel_description(
    *,
    hook: str = "",
    synopsis: str = "",
    worldview: str = "",
    protagonist: str = "",
    selling_points: str = "",
) -> str:
    """Merge fields into one stored description for Agent context."""
    parts: list[str] = []
    if hook.strip():
        parts.append(f"【一句话卖点】{hook.strip()}")
    if synopsis.strip():
        parts.append(f"【简介】\n{synopsis.strip()}")
    if worldview.strip():
        parts.append(f"【世界观】{worldview.strip()}")
    if protagonist.strip():
        parts.append(f"【主角】{protagonist.strip()}")
    if selling_points.strip():
        parts.append(f"【卖点】{selling_points.strip()}")
    return "\n\n".join(parts)


def _normalize_suggestion(raw: NovelDraftSuggestion, req: NovelDescriptionRequest) -> NovelDescriptionResponse:
    title = _clip(raw.title or req.title, _FIELD_MAX["title"]) or "未命名作品"
    genre = _clip(raw.genre or req.genre, _FIELD_MAX["genre"]) or "玄幻"
    tags = _clip(raw.tags or req.tags, _FIELD_MAX["tags"]) or "爽文"
    style = _clip(raw.style or req.style, _FIELD_MAX["style"]) or "快节奏"
    hook = _clip(raw.hook or req.hook, _FIELD_MAX["hook"])
    protagonist = _clip(raw.protagonist or req.protagonist, _FIELD_MAX["protagonist"])
    worldview = _clip(raw.worldview or req.worldview, _FIELD_MAX["worldview"])
    synopsis = _clip(raw.synopsis or req.synopsis or req.draft, _SYNOPSIS_MAX)
    selling_points = _clip(raw.selling_points or req.selling_points, _FIELD_MAX["selling_points"])
    words = raw.target_chapter_words or req.target_chapter_words or 3000
    words = max(1500, min(5000, int(words)))

    if not synopsis:
        synopsis = _fallback_synopsis(req, title, genre, tags, style)

    description = assemble_novel_description(
        hook=hook,
        synopsis=synopsis,
        worldview=worldview,
        protagonist=protagonist,
        selling_points=selling_points,
    )

    return NovelDescriptionResponse(
        title=title,
        genre=genre,
        tags=tags,
        style=style,
        hook=hook,
        protagonist=protagonist,
        worldview=worldview,
        synopsis=synopsis,
        selling_points=selling_points,
        target_chapter_words=words,
        description=description,
    )


def _fallback_synopsis(
    req: NovelDescriptionRequest,
    title: str,
    genre: str,
    tags: str,
    style: str,
) -> str:
    tag_text = tags.replace(" ", "·") if tags else style or "爽文"
    return (
        f"《{title}》是一部{genre}题材的{tag_text}长篇。"
        "主角在异变的世界中觉醒独特能力，围绕生存与成长展开冒险，"
        "世界观强调力量体系与人物羁绊，节奏明快，适合连载扩写。"
    )


def _fallback_response(req: NovelDescriptionRequest) -> NovelDescriptionResponse:
    title = _clip(req.title, _FIELD_MAX["title"]) or "未命名作品"
    genre = _clip(req.genre, _FIELD_MAX["genre"]) or "玄幻"
    tags = _clip(req.tags, _FIELD_MAX["tags"]) or "爽文"
    style = _clip(req.style, _FIELD_MAX["style"]) or "快节奏"
    hook = _clip(req.hook, _FIELD_MAX["hook"])
    protagonist = _clip(req.protagonist, _FIELD_MAX["protagonist"])
    worldview = _clip(req.worldview, _FIELD_MAX["worldview"])
    synopsis = _clip(req.synopsis or req.draft, _SYNOPSIS_MAX) or _fallback_synopsis(
        req, title, genre, tags, style
    )
    selling_points = _clip(req.selling_points, _FIELD_MAX["selling_points"])
    words = req.target_chapter_words or 3000
    words = max(1500, min(5000, int(words)))

    return NovelDescriptionResponse(
        title=title,
        genre=genre,
        tags=tags,
        style=style,
        hook=hook,
        protagonist=protagonist,
        worldview=worldview,
        synopsis=synopsis,
        selling_points=selling_points,
        target_chapter_words=words,
        description=assemble_novel_description(
            hook=hook,
            synopsis=synopsis,
            worldview=worldview,
            protagonist=protagonist,
            selling_points=selling_points,
        ),
    )


def _build_user_prompt(req: NovelDescriptionRequest) -> str:
    lines = [
        f"模式：{'优化润色' if req.mode == 'optimize' else '从零生成'}",
        f"书名：{req.title or '（待生成）'}",
        f"主分类：{req.genre or '—'}",
        f"风格标签：{req.tags or '—'}",
        f"叙事风格：{req.style or '—'}",
        f"一句话卖点：{req.hook or '—'}",
        f"主角设定：{req.protagonist or '—'}",
        f"世界观：{req.worldview or '—'}",
        f"书籍简介：{req.synopsis or '—'}",
        f"卖点关键词：{req.selling_points or '—'}",
        f"章节字数：{req.target_chapter_words or '—'}",
    ]
    if req.draft.strip():
        lines.append(f"用户自由草稿：\n{req.draft.strip()}")
    return "\n".join(lines)


_SYSTEM_GENERATE = (
    "你是番茄小说平台的资深策划编辑，熟悉网文上架字段与读者口味。"
    "根据用户提供的书名、标签或草稿，一次性输出完整建书信息："
    "书名、主分类、风格标签、叙事风格、一句话卖点、主角、世界观、"
    "书籍简介（2-4段纯文本，120-300字，含冲突与连载钩子）、卖点关键词、建议章节字数。"
    "标签用空格分隔（如 爽文 单女主 系统）；分类用番茄常见大类；"
    "简介禁止 markdown、禁止列表编号、禁止输出思考过程。"
)

_SYSTEM_OPTIMIZE = (
    "你是番茄小说平台的资深策划编辑。根据用户已填写的建书字段与草稿，"
    "优化并补全全部字段：保持题材一致，强化钩子与简介吸引力，"
    "标签与分类符合番茄上架习惯。简介 2-4 段纯文本 120-300 字。"
    "禁止 markdown、禁止列表编号、禁止输出思考过程。"
)


async def suggest_novel_description(req: NovelDescriptionRequest) -> NovelDescriptionResponse:
    fallback = _fallback_response(req)

    if not llm_provider.is_configured:
        return fallback

    system = SystemMessage(content=_SYSTEM_OPTIMIZE if req.mode == "optimize" else _SYSTEM_GENERATE)
    human = HumanMessage(content=_build_user_prompt(req))

    try:
        raw = await invoke_structured_with_retry(
            [system, human],
            NovelDraftSuggestion,
            profile="fast",
        )
        return _normalize_suggestion(raw, req)
    except Exception:
        logger.exception("novel draft structured generation failed")
        return fallback
