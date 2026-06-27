"""Query rewrite for retrieval — multi-query expansion + lexical fallback."""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field

from langchain_core.messages import HumanMessage, SystemMessage

from app.config import settings
from app.core.llm import llm_provider
from app.core.llm_content import extract_llm_text

logger = logging.getLogger(__name__)

_TOKEN_RE = re.compile(r"[\w\u4e00-\u9fff]{2,}", re.UNICODE)

_REWRITE_SYSTEM = (
    "You rewrite user messages into search queries for session memory retrieval. "
    "Output JSON only."
)

_REWRITE_PROMPT = """The user is continuing a novel-writing agent session. Produce search queries to find relevant **past session turns** (earlier user requests, assistant replies, tool summaries).

Current user message:
{user_message}

Session hints:
- session_id: {session_id}
- novel_id: {novel_id}
- chapter hint: {chapter_hint}
- recent turns (newest last, truncated):
{recent_block}

Return JSON:
{{
  "primary": "<best single search query, same language as user>",
  "variants": ["<alternate phrasing 1>", "<alternate phrasing 2>", ...],
  "keywords": ["<entity/topic>", "..."]
}}

Rules:
- primary must preserve intent (characters, chapter numbers, plot beats, tool artifacts).
- variants: {variant_count} diverse phrasings (synonyms, de-contextualized, keyword-heavy).
- keywords: 3-8 nouns/phrases for lexical recall.
- Use Chinese if the user wrote in Chinese; otherwise match user language.
- No markdown fences."""


@dataclass
class RetrievalQueryPlan:
    primary: str
    variants: list[str] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)
    rewrite_source: str = "passthrough"

    def all_queries(self, *, max_queries: int = 6) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for q in [self.primary, *self.variants, *self.keywords]:
            body = str(q or "").strip()
            if not body or body in seen:
                continue
            seen.add(body)
            out.append(body)
            if len(out) >= max_queries:
                break
        return out


def _trim(text: str, limit: int) -> str:
    body = str(text or "").strip()
    if len(body) <= limit:
        return body
    return body[: limit - 1] + "…"


def _format_recent_turns(recent_turns: list[dict] | None) -> str:
    if not recent_turns:
        return "(none)"
    lines: list[str] = []
    for turn in recent_turns[-4:]:
        if not isinstance(turn, dict):
            continue
        role = str(turn.get("role") or turn.get("kind") or "?")
        content = _trim(str(turn.get("content") or turn.get("snippet") or ""), 200)
        if content:
            lines.append(f"- [{role}] {content}")
    return "\n".join(lines) if lines else "(none)"


def _lexical_fallback_queries(user_message: str, *, variant_count: int) -> RetrievalQueryPlan:
    text = str(user_message or "").strip()
    tokens = _TOKEN_RE.findall(text)
    keywords = list(dict.fromkeys(tokens))[:8]
    variants: list[str] = []
    if keywords:
        variants.append(" ".join(keywords[:6]))
    if len(keywords) >= 3:
        variants.append(" ".join(keywords[2:8]))
    while len(variants) < variant_count:
        variants.append(text)
        break
    return RetrievalQueryPlan(
        primary=text,
        variants=variants[:variant_count],
        keywords=keywords,
        rewrite_source="lexical_fallback",
    )


def _parse_rewrite_json(raw: str, *, user_message: str, variant_count: int) -> RetrievalQueryPlan | None:
    text = (raw or "").strip()
    if not text:
        return None
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        parsed = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None
    if not isinstance(parsed, dict):
        return None
    primary = str(parsed.get("primary") or user_message).strip() or user_message
    variants_raw = parsed.get("variants")
    variants = [
        str(v).strip()
        for v in (variants_raw if isinstance(variants_raw, list) else [])
        if str(v).strip()
    ][:variant_count]
    keywords_raw = parsed.get("keywords")
    keywords = [
        str(k).strip()
        for k in (keywords_raw if isinstance(keywords_raw, list) else [])
        if str(k).strip()
    ][:8]
    return RetrievalQueryPlan(
        primary=primary,
        variants=variants,
        keywords=keywords,
        rewrite_source="llm",
    )


async def build_retrieval_query_plan(
    *,
    user_message: str,
    session_id: str = "",
    novel_id: str = "",
    chapter_hint: str = "",
    recent_turns: list[dict] | None = None,
) -> RetrievalQueryPlan:
    """
    LLM multi-query rewrite with lexical fallback.

    Used by session RAG (and reusable for chapter scope expansion later).
    """
    msg = str(user_message or "").strip()
    if not msg:
        return RetrievalQueryPlan(primary="", rewrite_source="empty")

    variant_count = max(1, min(int(getattr(settings, "agent_session_query_rewrite_variants", 3) or 3), 5))
    rewrite_enabled = bool(getattr(settings, "agent_session_query_rewrite_enabled", True))

    if not rewrite_enabled:
        return _lexical_fallback_queries(msg, variant_count=variant_count)

    prompt = _REWRITE_PROMPT.format(
        user_message=msg,
        session_id=session_id or "(unknown)",
        novel_id=novel_id or "(none)",
        chapter_hint=chapter_hint or "(none)",
        recent_block=_format_recent_turns(recent_turns),
        variant_count=variant_count,
    )
    try:
        llm = llm_provider.get_llm(profile="fast")
        response = await llm.ainvoke(
            [
                SystemMessage(content=_REWRITE_SYSTEM),
                HumanMessage(content=prompt),
            ]
        )
        raw = extract_llm_text(getattr(response, "content", ""), include_thinking=False)
        plan = _parse_rewrite_json(raw, user_message=msg, variant_count=variant_count)
        if plan and plan.primary:
            return plan
    except Exception as exc:
        logger.warning("session query rewrite LLM failed: %s", exc)

    return _lexical_fallback_queries(msg, variant_count=variant_count)
