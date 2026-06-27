"""从小说元数据推断封面上下文。"""

from __future__ import annotations

import re

from app.services.cover.schemas import CoverPromptRequest
from app.services.cover.spec import infer_archetype, infer_layout_mode


def clip(text: str, max_len: int) -> str:
    cleaned = re.sub(r"[\r\n\t]+", " ", (text or "").strip())
    cleaned = re.sub(r"\s+", " ", cleaned)
    if len(cleaned) > max_len:
        return cleaned[:max_len].rstrip(" ,，")
    return cleaned


def infer_category(genre: str, style: str) -> str:
    parts = [p.strip() for p in (genre, style) if p and p.strip()]
    return "、".join(parts) if parts else "网文"


def infer_mood(description: str) -> str:
    desc = (description or "").strip()
    if not desc:
        return "强情绪、高辨识度"
    return desc[:120] if len(desc) > 120 else desc


def resolve_context(req: CoverPromptRequest) -> tuple[str, str, str, str]:
    archetype = infer_archetype(req.genre, req.style, req.description, req.title)
    layout = infer_layout_mode(req.genre, req.style, req.description, req.title, archetype)
    category = infer_category(req.genre, req.style)
    mood = infer_mood(req.description)
    return archetype, category, mood, layout
