"""Skill loader — novel-studio API is the only production source."""

from __future__ import annotations

import json
from uuid import uuid4

from app.agent.backend import skill_api
from app.agent.context.skill_metadata import merge_skill_metadata, skill_metadata_from_api
from app.agent.harness.events import (
    emit_skill_failed,
    emit_skill_loaded,
    emit_skill_started,
)
from app.agent.schemas import AgentRunContext
from app.agent.tools.schemas import SkillInput
from app.agent.tools.tool import ToolCallResult, build_tool
from app.config import settings


def _api_configured() -> bool:
    return bool(
        (settings.content_base_url or "").strip()
        and (settings.internal_service_key or "").strip()
    )


def _skill_sources_available() -> bool:
    return _api_configured()


def _existing_skill_prompt(ctx: AgentRunContext) -> str:
    parts: list[str] = []
    top = (ctx.skill_prompt or "").strip()
    if top:
        parts.append(top)
    patch = ctx.context_patch if isinstance(ctx.context_patch, dict) else {}
    patch_text = patch.get("skill_prompt")
    if isinstance(patch_text, str) and patch_text.strip() and patch_text.strip() not in parts:
        parts.append(patch_text.strip())
    return "\n\n".join(parts)


def _append_skill_prompt(ctx: AgentRunContext, body: str) -> str:
    existing = _existing_skill_prompt(ctx)
    new_body = (body or "").strip()
    if not new_body:
        return existing
    if existing:
        return f"{existing}\n\n{new_body}"
    return new_body


def _parsed_from_api(data: dict) -> tuple[str, str, str]:
    content = str(data.get("content") or "").strip()
    name = str(data.get("name") or data.get("slug") or "unknown").strip() or "unknown"
    version = str(data.get("version") or "1")
    return name, content, version


def _skill_ref(inp: SkillInput) -> str:
    skill_id = (inp.skill_id or "").strip()
    if skill_id:
        return skill_id
    return (inp.skill or "").strip().replace("/", "").replace("\\", "")


async def invoke_skill(ctx: AgentRunContext, inp: SkillInput) -> ToolCallResult:
    ref_id = _skill_ref(inp)
    display_name = ref_id or "skill"
    step_id = f"step_{uuid4().hex}"
    seq = 0
    events = [
        emit_skill_started(
            ctx,
            skill_id=ref_id,
            name=display_name,
            sequence=seq,
            step_id=step_id,
        )
    ]
    seq += 1

    if not _api_configured():
        err = "skill API not configured (CONTENT_BASE_URL + INTERNAL_SERVICE_KEY required)"
        events.append(
            emit_skill_failed(
                ctx,
                skill_id=ref_id,
                name=display_name,
                error=err,
                sequence=seq,
                step_id=step_id,
            )
        )
        return ToolCallResult(
            content=f"<tool_use_error>{err}</tool_use_error>",
            is_error=True,
            sse_events=events,
        )

    try:
        data = await skill_api.fetch_skill(ref_id, ctx.user_id)
        parsed_name, body, version = _parsed_from_api(data)
        api_id = str(data.get("id") or ref_id)
        display_name = parsed_name or display_name
    except Exception as exc:
        err = str(exc).strip() or "skill fetch failed"
        events.append(
            emit_skill_failed(
                ctx,
                skill_id=ref_id,
                name=display_name,
                error=err,
                sequence=seq,
                step_id=step_id,
            )
        )
        return ToolCallResult(
            content=f"<tool_use_error>{err}</tool_use_error>",
            is_error=True,
            sse_events=events,
        )

    body = body[:8000]
    if not body:
        err = f"skill content empty: {display_name}"
        events.append(
            emit_skill_failed(
                ctx,
                skill_id=ref_id,
                name=display_name,
                error=err,
                sequence=seq,
                step_id=step_id,
            )
        )
        return ToolCallResult(
            content=f"<tool_use_error>{err}</tool_use_error>",
            is_error=True,
            sse_events=events,
        )

    merged_prompt = _append_skill_prompt(ctx, body)
    meta = skill_metadata_from_api(data, fallback_id=ref_id)
    patch: dict = {
        "skill_prompt": merged_prompt,
        "last_skill": display_name,
    }
    existing_ids = [row for row in (ctx.skill_ids or []) if isinstance(row, dict)]
    merged_ids = merge_skill_metadata(existing_ids, meta)
    if merged_ids is not None:
        patch["skill_ids"] = merged_ids
    events.append(
        emit_skill_loaded(
            ctx,
            skill_id=api_id,
            name=display_name,
            sequence=seq,
            step_id=step_id,
        )
    )
    return ToolCallResult(
        content=json.dumps(
            {"skill": display_name, "loaded": True, "version": version},
            ensure_ascii=False,
        ),
        context_patch=patch,
        sse_events=events,
    )


SKILL_TOOLS = [
    build_tool(
        name="Skill",
        description=(
            "Load a skill from the platform library (official or user) by skill_id or slug. "
            "Available skills are listed in RUN_CONTEXT.skills.catalog — metadata only. "
            "When a skill matches the user's task, invoke this tool BEFORE generating task output "
            "to load full instructions. Do not mention a skill without calling this tool."
        ),
        input_model=SkillInput,
        call=invoke_skill,
        is_enabled=lambda _c: _skill_sources_available(),
    ),
]
