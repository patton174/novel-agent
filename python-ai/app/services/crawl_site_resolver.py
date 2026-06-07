"""站点级导航：从首页/排行榜按自然语言目标定位具体书籍。"""

from __future__ import annotations

import json
import logging
import re
from collections.abc import Awaitable, Callable
from typing import Any
from urllib.parse import urljoin, urlparse

from app.core.llm import generate_text, llm_provider
from app.services.crawl_scrapling import page_links, page_text

logger = logging.getLogger(__name__)

SYSTEM = (
    "你是小说网站导航助手。根据用户爬取目标，从页面链接中选出下一步应访问的 URL。"
    "只输出合法 JSON，不要 markdown，不要解释。"
)

BOOK_PATH_HINTS = ("/book/", "/novel/", "/shu/", "/books/", "/bookinfo/", "/info/")

RANKING_LINK_HINTS = (
    "排行",
    "榜单",
    "热门",
    "热度",
    "推荐",
    "强推",
    "排行榜",
    "点击榜",
    "新书榜",
    "top",
    "rank",
    "hot",
)


def is_site_entry_url(url: str) -> bool:
    parsed = urlparse(url)
    path = (parsed.path or "").strip("/")
    if not path or path in {"index.html", "index.php", "index.htm", "home", "default.html"}:
        return True
    return False


def goal_needs_site_discovery(goal: str) -> bool:
    text = goal or ""
    patterns = (
        r"热度",
        r"排行",
        r"热门",
        r"推荐",
        r"第一本",
        r"第一的书",
        r"榜首",
        r"站点",
        r"首页",
        r"网站",
        r"找一本",
        r"随便.*书",
    )
    return any(re.search(p, text) for p in patterns)


def _same_site(a: str, b: str) -> bool:
    pa, pb = urlparse(a), urlparse(b)
    if pa.netloc and pb.netloc and pa.netloc != pb.netloc:
        return False
    return True


def _heuristic_ranking_urls(links: list[dict[str, str]], page_url: str, *, limit: int = 5) -> list[str]:
    scored: list[tuple[int, str]] = []
    seen: set[str] = set()
    for item in links:
        title = str(item.get("title") or "")
        url = str(item.get("url") or "").strip()
        if not url or url in seen or not _same_site(page_url, url):
            continue
        score = 0
        for hint in RANKING_LINK_HINTS:
            if hint in title or hint in url.lower():
                score += 10
        if score > 0:
            seen.add(url)
            scored.append((score, urljoin(page_url, url)))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [u for _, u in scored[:limit]]


def _heuristic_book_urls(
    links: list[dict[str, str]],
    page_url: str,
    *,
    limit: int = 15,
    pick_first: bool = False,
) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for item in links:
        url = str(item.get("url") or "").strip()
        title = str(item.get("title") or "").strip()
        if not url or url in seen or not _same_site(page_url, url):
            continue
        lower = url.lower()
        if not any(h in lower for h in BOOK_PATH_HINTS):
            continue
        if len(title) < 2 and "/book/" not in lower:
            continue
        seen.add(url)
        out.append(urljoin(page_url, url))
        if pick_first:
            return out[:1]
        if len(out) >= limit:
            break
    return out


async def resolve_site_for_goal(
    page,
    page_url: str,
    links: list[dict[str, str]],
    goal: str,
) -> dict[str, Any]:
    if not llm_provider.is_configured:
        pick_first = goal_needs_site_discovery(goal)
        books = _heuristic_book_urls(links, page_url, pick_first=pick_first)
        return {
            "page_type": "site_home",
            "novel_urls": books[:5],
            "next_urls": _heuristic_ranking_urls(links, page_url),
            "selected_title": "",
            "reason": "规则匹配",
        }

    body = page_text(page, 12000)
    prompt = f"""用户爬取目标：
{goal}

当前页面 URL: {page_url}
（可能是网站首页、排行榜、分类列表、搜索页，不一定是某本书）

页面文本节选:
{body[:6000]}

页面链接 JSON:
{json.dumps(links[:400], ensure_ascii=False)}

请返回 JSON：
{{
  "page_type": "site_home" | "ranking" | "book_list" | "book_detail" | "catalog" | "chapter" | "unknown",
  "novel_urls": ["符合用户目标的书籍详情页 URL，按匹配度排序，最多 5 个，绝对 URL"],
  "next_urls": ["若需先进入排行榜/热门/分类列表再选书，填中间页 URL，最多 3 个"],
  "selected_title": "若已选中书名则填写，否则空字符串",
  "reason": "一句话说明选择依据"
}}

规则示例：
- 目标含「热度第一/排行榜第一/推荐第一本」→ 优先从「强力推荐/热门/排行」区域选第一本书；若无明确榜单则选页面最靠前的小说详情链接
- 目标含具体书名 → novel_urls 填该书详情页
- book_detail / catalog / chapter 表示当前页已是书籍相关页，novel_urls 可含当前页或书籍主页
"""
    raw = await generate_text(prompt, system_message=SYSTEM, temperature=0.15)
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    data = json.loads(text)
    if not isinstance(data, dict):
        return {"page_type": "unknown", "novel_urls": [], "next_urls": []}

    def norm_list(key: str) -> list[str]:
        raw_list = data.get(key) or []
        if isinstance(raw_list, str):
            raw_list = [raw_list]
        out: list[str] = []
        seen: set[str] = set()
        for item in raw_list:
            u = urljoin(page_url, str(item).strip())
            if u and u not in seen:
                seen.add(u)
                out.append(u)
        return out

    data["novel_urls"] = norm_list("novel_urls")
    data["next_urls"] = norm_list("next_urls")
    return data


async def discover_novel_entry(
    start_url: str,
    goal: str,
    *,
    fetch_page: Callable[[str], Any],
    max_hops: int = 8,
    on_hop: Callable[[str], Awaitable[None] | None] | None = None,
) -> str:
    """从站点入口（首页/榜单等）导航到具体书籍页 URL。"""
    visited: set[str] = set()
    queue: list[str] = [start_url]
    pick_first = goal_needs_site_discovery(goal)
    last_reason = ""

    async def notify(msg: str) -> None:
        if on_hop is None:
            return
        result = on_hop(msg)
        if result is not None:
            await result

    for _ in range(max_hops):
        if not queue:
            break
        current_url = queue.pop(0)
        if current_url in visited:
            continue
        visited.add(current_url)

        try:
            page = fetch_page(current_url)
        except Exception as exc:
            logger.debug("fetch site nav failed url=%s: %s", current_url, exc)
            continue

        links = page_links(page, current_url)
        nav = await resolve_site_for_goal(page, current_url, links, goal)
        page_type = str(nav.get("page_type") or "unknown").lower()
        last_reason = str(nav.get("reason") or "")

        if nav.get("selected_title"):
            await notify(f"AI 选中：{nav['selected_title']}")

        novel_urls = list(nav.get("novel_urls") or [])
        next_urls = list(nav.get("next_urls") or [])

        if page_type in {"book_detail", "catalog", "chapter"} and novel_urls:
            return novel_urls[0]
        if page_type in {"book_detail", "catalog", "chapter"}:
            return current_url

        # 首页/榜单：优先书籍直链
        if novel_urls:
            if pick_first or page_type in {"ranking", "book_list", "site_home"}:
                await notify(f"进入书籍页：{novel_urls[0]}")
                return novel_urls[0]
            queue[:0] = [u for u in novel_urls if u not in visited]

        for nu in next_urls:
            if nu not in visited:
                await notify(f"浏览站点列表：{nu}")
                queue.append(nu)

        # 启发式兜底
        if not novel_urls and not next_urls:
            for bu in _heuristic_book_urls(links, current_url, pick_first=pick_first):
                if bu not in visited:
                    await notify(f"启发式选中书籍：{bu}")
                    return bu
            for ru in _heuristic_ranking_urls(links, current_url):
                if ru not in visited:
                    await notify(f"进入榜单页：{ru}")
                    queue.append(ru)

    hint = "未能根据目标在站点中找到书籍"
    if last_reason:
        hint = f"{hint}（{last_reason}）"
    raise ValueError(hint)
