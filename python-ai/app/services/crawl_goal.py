"""自然语言爬取目标解析 — 将用户描述转为可执行参数。"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from app.core.llm import generate_text, llm_provider

DEFAULT_GOAL = "把链接中的小说全部章节抓取并清洗正文，入库公共书库"

SYSTEM = (
    "你是爬虫任务规划助手。根据用户的自然语言目标，输出 JSON 执行参数。"
    "只输出合法 JSON，不要 markdown，不要解释。"
)


@dataclass
class CrawlGoalSpec:
    raw_goal: str
    max_chapters: int = 0
    use_stealth: bool = False
    summary: str = ""


def goal_from_config(site_config: dict[str, Any] | None) -> str:
    if not site_config:
        return DEFAULT_GOAL
    goal = site_config.get("goal") or site_config.get("target") or site_config.get("description")
    if isinstance(goal, str) and goal.strip():
        return goal.strip()
    return DEFAULT_GOAL


def options_from_config(site_config: dict[str, Any] | None) -> dict[str, Any]:
    if not site_config:
        return {}
    return dict(site_config)


async def interpret_goal(goal: str, *, base_max_chapters: int = 0) -> CrawlGoalSpec:
    text = (goal or DEFAULT_GOAL).strip()
    spec = CrawlGoalSpec(raw_goal=text, max_chapters=base_max_chapters)

    # 快速规则（无需 LLM）
    if re.search(r"stealth|无头|反爬|浏览器模式", text, re.I):
        spec.use_stealth = True
    m = re.search(r"(?:前|最多|上限)?\s*(\d{1,4})\s*章", text)
    if m:
        spec.max_chapters = min(2000, max(1, int(m.group(1))))

    if not llm_provider.is_crawl_configured:
        spec.summary = text[:120]
        return spec

    prompt = f"""用户爬取目标：
{text}

请返回 JSON：
{{
  "max_chapters": 整数，默认 {base_max_chapters}，用户若限定章数则按语义填写,
  "use_stealth": 是否建议 Stealth 浏览器（反爬/动态渲染站点）,
  "summary": "一句话执行摘要，中文"
}}
"""
    try:
        raw = await generate_text(prompt, system_message=SYSTEM, temperature=0.1, profile="crawl")
        data = json.loads(raw.strip().removeprefix("```json").removesuffix("```").strip())
        if isinstance(data, dict):
            if isinstance(data.get("max_chapters"), int):
                spec.max_chapters = min(2000, max(1, data["max_chapters"]))
            if isinstance(data.get("use_stealth"), bool):
                spec.use_stealth = data["use_stealth"]
            if isinstance(data.get("summary"), str) and data["summary"].strip():
                spec.summary = data["summary"].strip()
    except Exception:
        spec.summary = text[:120]
    if not spec.summary:
        spec.summary = text[:120]
    return spec
