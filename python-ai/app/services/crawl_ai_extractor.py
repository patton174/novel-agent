"""AI-first extraction for novel crawling (LLM primary, Scrapling for fetch)."""

from __future__ import annotations

import json
import logging
import re
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin, urlparse

from app.core.llm import generate_text, llm_provider
from app.services.crawl_scrapling import page_links as _links_from_page
from app.services.crawl_scrapling import page_text as _page_text

logger = logging.getLogger(__name__)

SYSTEM_EXTRACTOR = (
    "你是专业的小说网页解析助手。"
    "根据页面 URL 与正文/链接信息，准确提取结构化数据。"
    "只输出合法 JSON，不要 markdown 代码块，不要解释。"
)

CATALOG_LINK_HINTS = (
    "目录",
    "章节",
    "章节目录",
    "全部章节",
    "开始阅读",
    "开始看书",
    "立即阅读",
    "免费阅读",
    "正文",
    "连载",
    "catalog",
    "chapter",
    "index",
    "list",
    "mulu",
    "read",
)

CATALOG_URL_HINTS = (
    "/catalog",
    "/index",
    "/list",
    "/dir",
    "/mulu",
    "/chapter",
    "/read",
    "_1.",
    "-1.",
    "/1.html",
    "/1.htm",
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


def _same_book_url(a: str, b: str) -> bool:
    pa, pb = urlparse(a), urlparse(b)
    if pa.netloc and pb.netloc and pa.netloc != pb.netloc:
        return False
    # 同一书籍路径前缀，例如 /book/4057577
    path_a = pa.path.rstrip("/")
    path_b = pb.path.rstrip("/")
    if not path_a or not path_b:
        return True
    parts_a = [p for p in path_a.split("/") if p]
    parts_b = [p for p in path_b.split("/") if p]
    if len(parts_a) >= 2 and len(parts_b) >= 2:
        return parts_a[:2] == parts_b[:2]
    return path_a.split("/")[0:1] == path_b.split("/")[0:1]


def _heuristic_catalog_urls(links: list[dict[str, str]], page_url: str, *, limit: int = 8) -> list[str]:
    scored: list[tuple[int, str]] = []
    seen: set[str] = set()
    for item in links:
        title = str(item.get("title") or "")
        url = str(item.get("url") or "").strip()
        if not url or url in seen:
            continue
        if not _same_book_url(page_url, url):
            continue
        lower_title = title.lower()
        lower_url = url.lower()
        score = 0
        for hint in CATALOG_LINK_HINTS:
            if hint in title or hint in lower_title:
                score += 12
        for hint in CATALOG_URL_HINTS:
            if hint in lower_url:
                score += 6
        if re.search(r"共\s*\d+\s*章", title):
            score += 15
        if score > 0:
            seen.add(url)
            scored.append((score, urljoin(page_url, url)))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [url for _, url in scored[:limit]]


def _dedupe_urls(urls: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for raw in urls:
        url = raw.strip()
        if not url or url in seen:
            continue
        seen.add(url)
        out.append(url)
    return out


async def resolve_page_navigation(page, page_url: str, links: list[dict[str, str]]) -> dict[str, Any]:
    if not llm_provider.is_crawl_configured:
        raise RuntimeError("LLM 未配置，AI 自动爬虫无法运行")

    body_text = _page_text(page, 10000)
    prompt = f"""分析小说网站页面。用户可输入任意与小说相关的 URL（书籍详情、目录、章节正文、阅读页等），不必是目录页。

页面 URL: {page_url}

页面可见文本（节选）:
{body_text[:7000]}

页面链接（JSON）:
{json.dumps(links[:350], ensure_ascii=False)}

返回 JSON：
{{
  "page_type": "catalog" | "book_detail" | "chapter" | "unknown",
  "novel_title": "书名或空",
  "author": "作者或空",
  "description": "简介或空",
  "catalog_urls": ["最可能包含完整章节列表的 URL，按优先级最多 5 个，可为相对路径"],
  "chapter_url": "若 page_type=chapter，当前章节 URL（通常即本页）",
  "chapter_title": "若 page_type=chapter，章节标题"
}}

说明：
- book_detail：书籍介绍页，章节列表常在「目录/开始阅读/全部章节」等链接的目标页
- catalog：当前页应能列出多章
- chapter：单章正文页，catalog_urls 请填同书目录/章节列表链接
"""
    raw = await generate_text(prompt, system_message=SYSTEM_EXTRACTOR, temperature=0.1, profile="crawl")
    data = _parse_json(raw)
    if not isinstance(data, dict):
        return {"page_type": "unknown", "catalog_urls": []}
    catalog_urls = data.get("catalog_urls") or []
    if isinstance(catalog_urls, str):
        catalog_urls = [catalog_urls]
    normalized = _dedupe_urls([urljoin(page_url, str(u)) for u in catalog_urls if str(u).strip()])
    data["catalog_urls"] = normalized
    return data


async def extract_catalog_from_page(page, page_url: str, *, max_chapters: int = 200) -> CatalogExtraction:
    if not llm_provider.is_crawl_configured:
        raise RuntimeError("LLM 未配置，AI 自动爬虫无法运行")

    links = _links_from_page(page, page_url)
    body_text = _page_text(page, 12000)
    prompt = f"""分析小说网页，提取元数据与章节列表。输入可以是书籍详情页、目录页、阅读页等任意小说相关 URL。

页面 URL: {page_url}

页面可见文本（节选）:
{body_text[:8000]}

页面链接（JSON，含 title 与 url）:
{json.dumps(links[:350], ensure_ascii=False)}

请返回 JSON 对象，格式：
{{
  "novel_title": "书名",
  "author": "作者或空字符串",
  "description": "简介或空字符串",
  "chapters": [{{"title": "章节名", "url": "绝对URL"}}]
}}

要求：
1. chapters 按阅读顺序排列，最多 {max_chapters} 条
2. 只保留正文章节链接，排除首页/分类/评论/登录/友链等
3. url 必须是可访问的章节地址（相对路径请转为基于 {page_url} 的绝对路径）
4. 若当前页是书籍详情且无内嵌章节，chapters 可返回空数组（后续会跳转目录页）
"""
    raw = await generate_text(prompt, system_message=SYSTEM_EXTRACTOR, temperature=0.2, profile="crawl")
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
    return CatalogExtraction(
        novel_title=title,
        author=author,
        description=description,
        chapters=chapters[:max_chapters],
    )


async def discover_catalog(
    page,
    page_url: str,
    *,
    max_chapters: int = 200,
    fetch_page: Callable[[str], Any] | None = None,
    max_hops: int = 4,
    on_hop: Callable[[str], Awaitable[None] | None] | None = None,
) -> CatalogExtraction:
    """从任意小说 URL 发现章节列表：当前页解析 → AI/启发式跳转 → 可选单章兜底。"""
    visited: set[str] = set()
    queue: list[tuple[Any, str]] = [(page, page_url)]
    last_meta: CatalogExtraction | None = None
    last_error: str | None = None

    async def _notify(msg: str) -> None:
        if on_hop is None:
            return
        result = on_hop(msg)
        if result is not None:
            await result

    for _ in range(max_hops):
        if not queue:
            break
        current_page, current_url = queue.pop(0)
        if current_url in visited:
            continue
        visited.add(current_url)

        try:
            extracted = await extract_catalog_from_page(current_page, current_url, max_chapters=max_chapters)
            last_meta = extracted
            if extracted.chapters:
                return extracted
        except Exception as exc:
            last_error = str(exc)
            extracted = None
            links = _links_from_page(current_page, current_url)
        else:
            links = _links_from_page(current_page, current_url)

        nav = await resolve_page_navigation(current_page, current_url, links)
        page_type = str(nav.get("page_type") or "unknown").lower()

        if page_type == "chapter":
            ch_url = str(nav.get("chapter_url") or current_url).strip()
            ch_title = str(nav.get("chapter_title") or "第一章").strip()
            novel_title = str(nav.get("novel_title") or (last_meta.novel_title if last_meta else "") or "未命名小说")
            return CatalogExtraction(
                novel_title=novel_title,
                author=str(nav.get("author") or (last_meta.author if last_meta else "")).strip(),
                description=str(nav.get("description") or (last_meta.description if last_meta else "")).strip(),
                chapters=[ChapterLink(title=ch_title[:200], url=urljoin(current_url, ch_url))],
            )

        candidates = _dedupe_urls(
            list(nav.get("catalog_urls") or []) + _heuristic_catalog_urls(links, current_url)
        )
        if fetch_page is None:
            continue
        for next_url in candidates:
            if next_url in visited:
                continue
            visited.add(next_url)
            await _notify(f"跳转目录页: {next_url}")
            try:
                next_page = fetch_page(next_url)
            except Exception as exc:
                logger.debug("fetch catalog candidate failed url=%s: %s", next_url, exc)
                continue
            queue.append((next_page, next_url))

    if last_meta and last_meta.chapters:
        return last_meta

    hint = "AI 未能从该链接识别章节列表"
    if last_error:
        hint = last_error
    raise ValueError(
        f"{hint}。可尝试在高级选项开启 useStealth，或换用同书「目录/开始阅读」链接"
    )


async def extract_catalog(page, page_url: str, *, max_chapters: int = 200) -> CatalogExtraction:
    """兼容旧调用：单页解析，无跳转。"""
    result = await extract_catalog_from_page(page, page_url, max_chapters=max_chapters)
    if not result.chapters:
        raise ValueError(
            "AI 未能识别章节列表。请使用 discover_catalog 以支持书籍详情页/章节页自动跳转"
        )
    return result


async def extract_chapter(page, page_url: str, fallback_title: str = "") -> ChapterExtraction:
    if not llm_provider.is_crawl_configured:
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
    raw = await generate_text(prompt, system_message=SYSTEM_EXTRACTOR, temperature=0.2, profile="crawl")
    data = _parse_json(raw)
    if not isinstance(data, dict):
        raise ValueError("AI 章节解析返回格式无效")
    title = str(data.get("title") or fallback_title or "未命名章节").strip()
    content = str(data.get("content") or "").strip()
    if len(content) < 50:
        raise ValueError("AI 未能提取有效章节正文")
    return ChapterExtraction(title=title, content=content)
