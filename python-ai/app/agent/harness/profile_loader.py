"""Load Agent Profile from HTTP API with bundled JSON fallback."""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from app.agent.backend import profile_api
from app.agent.context.skill_metadata import skill_metadata_from_api

logger = logging.getLogger(__name__)

_DEFAULT_PROFILE_ID = "chapter-writer"
_CACHE_TTL_SEC = 60.0
_cache: dict[str, tuple[float, "AgentProfileModel"]] = {}


class AgentProfileModel(BaseModel):
    id: str
    display_name: str = ""
    system_prompt_template: str = ""
    tool_allowlist: list[str] = Field(default_factory=list)
    model_override: dict[str, Any] | None = None
    max_turns: int | None = None
    skill_ids: list[str] = Field(default_factory=list)


def _bundled_root() -> Path:
    return Path(__file__).resolve().parents[3] / "profiles" / "bundled"


def _profile_from_dict(data: dict[str, Any]) -> AgentProfileModel:
    allowlist = data.get("tool_allowlist") or data.get("toolAllowlist") or []
    if not isinstance(allowlist, list):
        allowlist = []
    skill_ids = data.get("skill_ids") or data.get("skillIds") or []
    if not isinstance(skill_ids, list):
        skill_ids = []
    raw_max = data.get("max_turns", data.get("maxTurns"))
    max_turns: int | None = None
    if raw_max is not None:
        try:
            max_turns = int(raw_max)
        except (TypeError, ValueError):
            max_turns = None
    return AgentProfileModel(
        id=str(data.get("id") or "").strip(),
        display_name=str(data.get("display_name") or data.get("displayName") or "").strip(),
        system_prompt_template=str(
            data.get("system_prompt_template") or data.get("systemPromptTemplate") or ""
        ).strip(),
        tool_allowlist=[str(x).strip() for x in allowlist if str(x).strip()],
        model_override=(
            data.get("model_override") or data.get("modelOverride")
            if isinstance(data.get("model_override") or data.get("modelOverride"), dict)
            else None
        ),
        max_turns=max_turns,
        skill_ids=[str(x).strip() for x in skill_ids if str(x).strip()],
    )


def load_bundled_profile(profile_id: str) -> AgentProfileModel | None:
    slug = (profile_id or "").strip().replace("/", "").replace("\\", "")
    if not slug:
        return None
    path = _bundled_root() / f"{slug}.json"
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("bundled profile read failed id=%s: %s", slug, exc)
        return None
    if not isinstance(data, dict):
        return None
    profile = _profile_from_dict(data)
    if not profile.id:
        profile = profile.model_copy(update={"id": slug})
    return profile


def get_cached_profile(profile_id: str) -> AgentProfileModel | None:
    key = (profile_id or "").strip()
    if not key:
        return None
    entry = _cache.get(key)
    if entry is None:
        return None
    expires_at, profile = entry
    if time.monotonic() >= expires_at:
        _cache.pop(key, None)
        return None
    return profile


def _store_cache(profile: AgentProfileModel) -> None:
    if not profile.id:
        return
    _cache[profile.id] = (time.monotonic() + _CACHE_TTL_SEC, profile)


def clear_profile_cache() -> None:
    _cache.clear()


async def fetch_profile(profile_id: str, user_id: int) -> AgentProfileModel:
    """Resolve profile: cache → HTTP → bundled fallback → chapter-writer."""
    key = (profile_id or "").strip() or _DEFAULT_PROFILE_ID
    cached = get_cached_profile(key)
    if cached is not None:
        return cached

    try:
        data = await profile_api.fetch_profile(key, user_id)
        profile = _profile_from_dict(data)
        if profile.id:
            _store_cache(profile)
            return profile
    except Exception as exc:
        logger.info("profile HTTP fetch failed id=%s: %s", key, exc)

    bundled = load_bundled_profile(key)
    if bundled is not None:
        _store_cache(bundled)
        return bundled

    if key != _DEFAULT_PROFILE_ID:
        logger.warning("unknown profile_id=%s — fallback %s", key, _DEFAULT_PROFILE_ID)
        return await fetch_profile(_DEFAULT_PROFILE_ID, user_id)

    raise RuntimeError(f"default profile {_DEFAULT_PROFILE_ID} not found")


def resolve_profile_sync(profile_id: str) -> AgentProfileModel:
    """Sync resolve for registry / prompt build: cache → bundled → default."""
    key = (profile_id or "").strip() or _DEFAULT_PROFILE_ID
    cached = get_cached_profile(key)
    if cached is not None:
        return cached
    bundled = load_bundled_profile(key)
    if bundled is not None:
        _store_cache(bundled)
        return bundled
    if key != _DEFAULT_PROFILE_ID:
        fallback = load_bundled_profile(_DEFAULT_PROFILE_ID)
        if fallback is not None:
            return fallback
    raise RuntimeError(f"profile not found: {key}")


def build_subagent_system_prompt(profile: AgentProfileModel) -> str:
    from app.agent.harness.subagent_policy import SUBAGENT_EXCLUDED_TOOLS
    from app.agent.harness.visible_text_channel import visible_text_prompt_block
    from app.agent.tools.registry import build_agent_tools, tools_for_profile
    from app.config import settings

    all_tools = build_agent_tools()
    allowed = tools_for_profile(profile, all_tools)
    names = ", ".join(sorted(t.name for t in allowed if t.name not in SUBAGENT_EXCLUDED_TOOLS))
    max_turns = profile.max_turns or settings.agent_subagent_max_turns
    channel_block = visible_text_prompt_block()
    template = (profile.system_prompt_template or "").strip()
    if not template:
        template = (
            "You are **{display_name}** for a novel-writing sub-task.\n\n"
            "Available tools: {tool_list}\n\n{channel_block}\n\n"
            "Complete only the delegated task (max ~{max_turns} turns)."
        )
    display = profile.display_name or profile.id
    return (
        template.replace("{display_name}", display)
        .replace("{tool_list}", names)
        .replace("{channel_block}", channel_block)
        .replace("{max_turns}", str(max_turns))
    )


async def merge_profile_skills(ctx, profile: AgentProfileModel):
    """Register profile skill_ids as metadata in ctx.skill_ids (CC lazy-load; no body at bootstrap)."""
    from app.agent.backend import skill_api

    if not profile.skill_ids:
        return ctx
    existing = [row for row in (ctx.skill_ids or []) if isinstance(row, dict)]
    added: list[dict] = []
    for ref in profile.skill_ids:
        slug = (ref or "").strip()
        if not slug:
            continue
        try:
            data = await skill_api.fetch_skill(slug, ctx.user_id)
        except Exception as exc:
            logger.info("profile skill metadata skipped id=%s: %s", slug, exc)
            continue
        meta = skill_metadata_from_api(data, fallback_id=slug)
        if not meta.get("enabled", True):
            continue
        if any(
            str(row.get("id") or "").strip() == meta["id"]
            or str(row.get("name") or "").strip() == meta["name"]
            for row in existing + added
        ):
            continue
        added.append(meta)
    if not added:
        return ctx
    return ctx.model_copy(update={"skill_ids": existing + added})
