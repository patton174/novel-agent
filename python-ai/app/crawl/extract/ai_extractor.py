"""AI-first extraction for novel crawling (selector fast-path + LLM fallback)."""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin, urlparse

from app.crawl.metrics import record_extract
from app.core.llm import generate_text, llm_provider
from app.crawl.engine.content_extract import extract_chapter_via_selector
from app.crawl.fetch.scrapling import page_text as _page_text

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
    path_a = pa.path.rstrip("/")
    path_b = pb.path.rstrip("/")
    if not path_a or not path_b:
        return True
    parts_a = [p for p in path_a.split("/") if p]
    parts_b = [p for p in path_b.split("/") if p]
    if len(parts_a) >= 2 and len(parts_b) >= 2 and parts_a[0] == parts_b[0] == "book":
        book_a = parts_a[1].split(".")[0]
        book_b = parts_b[1].split(".")[0]
        return book_a == book_b
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


async def extract_chapter(
    page,
    page_url: str,
    fallback_title: str = "",
    *,
    site_config: dict[str, Any] | None = None,
) -> ChapterExtraction:
    started = time.perf_counter()
    fast = extract_chapter_via_selector(
        page,
        fallback_title=fallback_title,
        site_config=site_config,
    )
    if fast:
        title, content = fast
        record_extract(path="selector", duration_sec=time.perf_counter() - started)
        return ChapterExtraction(title=title, content=content)

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
    record_extract(path="llm", duration_sec=time.perf_counter() - started)
    return ChapterExtraction(title=title, content=content)
