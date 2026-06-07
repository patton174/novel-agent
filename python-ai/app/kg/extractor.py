"""LLM-based entity/relation extraction from chapter text."""

from __future__ import annotations

import json
import re
from typing import Any

from app.core.llm import generate_text

_SYSTEM = """你是小说知识图谱抽取器。从章节正文中抽取实体与关系，只输出 JSON，不要 markdown 或解释。

实体 type 取值：character | location | item | faction | event
关系 rel 用简短中文动词短语（如 师承、位于、持有、属于）。

输出格式：
{"entities":[{"name":"角色名","type":"character"}],"relations":[{"src":"A","rel":"关系","dst":"B"}]}"""

_PROMPT = """章节正文：
---
{text}
---

抽取实体与关系，输出 JSON。"""


def _normalize_entities(raw: list[Any]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        if not name:
            continue
        etype = str(item.get("type") or "unknown").strip() or "unknown"
        out.append({"name": name, "type": etype})
    return out


def _normalize_relations(raw: list[Any]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        src = str(item.get("src") or "").strip()
        rel = str(item.get("rel") or "").strip()
        dst = str(item.get("dst") or "").strip()
        if src and rel and dst:
            out.append({"src": src, "rel": rel, "dst": dst})
    return out


def parse_extraction_json(raw: str) -> dict[str, list[dict[str, str]]]:
    text = (raw or "").strip()
    if not text:
        return {"entities": [], "relations": []}
    if "```" in text:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if match:
            text = match.group(1).strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return {"entities": [], "relations": []}
    if not isinstance(data, dict):
        return {"entities": [], "relations": []}
    return {
        "entities": _normalize_entities(data.get("entities") or []),
        "relations": _normalize_relations(data.get("relations") or []),
    }


async def extract_entities_relations(chapter_text: str) -> dict[str, list[dict[str, str]]]:
    text = (chapter_text or "").strip()
    if not text:
        return {"entities": [], "relations": []}
    raw = await generate_text(
        _PROMPT.format(text=text[:8000]),
        system_message=_SYSTEM,
        temperature=0.1,
    )
    return parse_extraction_json(raw)
