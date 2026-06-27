"""Parse choose-tool text output into structured options."""

from __future__ import annotations

import re
from typing import Any


def _is_invalid_choice_title(title: str) -> bool:
    t = title.strip()
    if not t:
        return True
    if len(t) < 2:
        return True
    # 2–3 字中文选项（如「倒叙」「正序」）合法；过短纯英文/符号仍丢弃
    if len(t) < 4 and not re.search(r"[\u4e00-\u9fff]", t):
        return True
    lower = t.lower()
    if "redacted_thinking" in lower or "<think" in lower:
        return True
    if t.startswith("用户") and any(k in t for k in ("需要我", "希望我", "想创作", "提供")):
        return True
    if "创作方向选项" in t and len(t) < 100:
        return True
    return False


def _normalize_choice_title(title: str) -> str:
    return re.sub(r"^标题[：:]\s*", "", (title or "").strip())


def sanitize_choose_options(options: list[dict[str, Any]]) -> list[dict[str, Any]]:
    cleaned: list[dict[str, Any]] = []
    for opt in options:
        title = _normalize_choice_title(str(opt.get("title") or ""))
        if _is_invalid_choice_title(title):
            continue
        description = str(opt.get("description") or "").strip()
        cleaned.append(
            {
                "id": f"opt-{len(cleaned) + 1}",
                "title": title,
                "description": description,
            }
        )
    return cleaned


def parse_choose_options(text: str) -> list[dict[str, Any]]:
    if not text or not text.strip():
        return []

    parts = re.split(r"【选项\s*\d+】", text)
    options: list[dict[str, Any]] = []

    for block in parts:
        block = block.strip()
        if not block:
            continue

        title_match = re.search(
            r"标题[：:]\s*(.+?)(?:\s{2,}|描述[：:]|$)",
            block,
        )
        desc_match = re.search(r"描述[：:]\s*([\s\S]+)", block)

        title = (title_match.group(1) if title_match else block.split("\n", 1)[0]).strip()
        description = (desc_match.group(1) if desc_match else "").strip()

        if title:
            options.append(
                {
                    "id": f"opt-{len(options) + 1}",
                    "title": title,
                    "description": description,
                }
            )

    return sanitize_choose_options(options)
