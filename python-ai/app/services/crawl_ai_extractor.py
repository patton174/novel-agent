"""AI-first extraction for novel crawling (LLM primary, Scrapling for fetch)."""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin

from app.core.llm import generate_text, llm_provider

logger = logging.getLogger(__name__)

SYSTEM_EXTRACTOR = (
    "你是专业的小说网页解析助手。"
    "根据页面 URL 与正文/链接信息，准确提取结构化数据。"
    "只输出合法 JSON，不要 markdown 代码块，不要解释。"
)


@dataclass
class ChapterLink:
    title: str
    url: str


@dataclass
class CatalogExtraction:
    novel_title: str
    chapters: list[ChapterLink]
    author: str = ""
    description: str = ""


@dataclass
class ChapterExtraction:
    title: str
    content: str


def _parse_json(raw: str) -> Any:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def _links_from_page(page, base_url: str, limit: int = 400) -> list[dict[str, str]]:
    """Generic link harvest — not site-specific selectors."""
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    for anchor in page.css("a"):
        href = anchor.attrib.get("href") if hasattr(anchor, "attrib") else None
        if not href or href.startswith("#") or href.lower().startswith("javascript:"):
            continue
        full = urljoin(base_url, href)
        if full in seen:
            continue
        text = ""
        if hasattr(anchor, "text") and anchor.text:
            text = anchor.text.strip()
        if not text and hasattr(anchor, "get"):
            text = str(anchor.get("text", "")).strip()
        if len(text) > 160:
            text = text[:160]
        seen.add(full)
        items.append({"title": text or full.rsplit("/", 1)[-1], "url": full})
        if len(items) >= limit:
            break
    return items


def _page_text(page, max_chars: int = 18000) -> str:
    if page is None:
        return ""
    if hasattr(page, "get_text"):
        try:
            text = page.get_text()
            if text and len(text.strip()) > 100:
                return text.strip()[:max_chars]
        except Exception:
            pass
    body_nodes = page.css("body")
    if body_nodes and hasattr(body_nodes[0], "text") and body_nodes[0].text:
        return body_nodes[0].text.strip()[:max_chars]
    return str(page)[:max_chars]


async def extract_catalog(page, page_url: str, *, max_chapters: int = 200) -> CatalogExtraction:
    if not llm_provider.is_configured:
        raise RuntimeError("LLM 未配置，AI 自动爬虫无法运行")

    links = _links_from_page(page, page_url)
    body_text = _page_text(page, 12000)
    prompt = f"""分析小说目录/书籍页，提取元数据与章节列表。

页面 URL: {page_url}

页面可见文本（节选）:
{body_text[:8000]}

页面链接（JSON，含 title 与 url）:
{json.dumps(links[:300], ensure_ascii=False)}

请返回 JSON 对象，格式：
{{
  "novel_title": "书名",
  "author": "作者或空字符串",
  "description": "简介或空字符串",
  "chapters": [{{"title": "章节名", "url": "绝对URL"}}]
}}

要求：
1. chapters 按阅读顺序排列，最多 {max_chapters} 条
2. 只保留正文章节链接，排除首页/分类/评论/登录等
3. url 必须是可访问的章节地址（相对路径请转为基于 {page_url} 的绝对路径）
"""
    raw = await generate_text(prompt, system_message=SYSTEM_EXTRACTOR, temperature=0.2)
    data = _parse_json(raw)
    if not isinstance(data, dict):
        raise ValueError("AI 目录解析返回格式无效")

    chapters: list[ChapterLink] = []
    for item in data.get("chapters") or []:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        url = str(item.get("url") or "").strip()
        if not url:
            continue
        chapters.append(ChapterLink(title=title[:200] or f"章节{len(chapters)+1}", url=urljoin(page_url, url)))

    title = str(data.get("novel_title") or "").strip() or "未命名小说"
    author = str(data.get("author") or "").strip()
    description = str(data.get("description") or "").strip()
    if not chapters:
        raise ValueError("AI 未能识别章节列表，请检查 URL 是否为小说目录页")

    return CatalogExtraction(
        novel_title=title,
        author=author,
        description=description,
        chapters=chapters[:max_chapters],
    )


async def extract_chapter(page, page_url: str, fallback_title: str = "") -> ChapterExtraction:
    if not llm_provider.is_configured:
        raise RuntimeError("LLM 未配置，AI 自动爬虫无法运行")

    body_text = _page_text(page, 20000)
    prompt = f"""从小说章节页提取标题与正文。

页面 URL: {page_url}
参考章节名: {fallback_title or "无"}

页面文本:
{body_text}

返回 JSON：
{{
  "title": "章节标题",
  "content": "纯正文，保留段落换行，不含导航/广告/评论区"
}}
"""
    raw = await generate_text(prompt, system_message=SYSTEM_EXTRACTOR, temperature=0.2)
    data = _parse_json(raw)
    if not isinstance(data, dict):
        raise ValueError("AI 章节解析返回格式无效")
    title = str(data.get("title") or fallback_title or "未命名章节").strip()
    content = str(data.get("content") or "").strip()
    if len(content) < 50:
        raise ValueError("AI 未能提取有效章节正文")
    return ChapterExtraction(title=title, content=content)
