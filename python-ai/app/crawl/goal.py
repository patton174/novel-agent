"""自然语言爬取目标解析 — 将用户描述转为可执行参数。"""

from __future__ import annotations

from typing import Any

DEFAULT_GOAL = "把链接中的小说全部章节抓取并清洗正文，入库公共书库"


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
