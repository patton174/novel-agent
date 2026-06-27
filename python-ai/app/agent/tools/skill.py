"""Skill loader tool — HTTP fetch, bundled fallback, legacy AGENT_SKILLS_DIR."""

from __future__ import annotations

import json
from pathlib import Path
from uuid import uuid4

from app.agent.backend import skill_api
from app.agent.harness.events import (
    emit_skill_failed,
    emit_skill_loaded,
    emit_skill_started,
)
from app.agent.harness.skill_loader import ParsedSkill, parse_skill_markdown, read_bundled_skill
from app.agent.schemas import AgentRunContext
from app.agent.tools.schemas import SkillInput
from app.agent.tools.tool import ToolCallResult, build_tool
from app.config import settings


def _skills_dir() -> Path | None:
    raw = (settings.agent_skills_dir or "").strip()
    if not raw:
        return None
    path = Path(raw)
    return path if path.is_dir() else None


def _skill_sources_available() -> bool:
    from app.agent.harness.skill_loader import load_bundled

    if load_bundled("fanqie-chapter-hook") is not None:
        return True
    if _skills_dir() is not None:
        return True
    return bool(
        (settings.content_base_url or "").strip()
        and (settings.internal_service_key or "").strip()
    )


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


def _read_legacy_skill(name: str) -> ParsedSkill | None:
    base = _skills_dir()
    if base is None:
        return None
    slug = (name or "").strip().replace("/", "").replace("\\", "")
    if not slug:
        return None
    candidates = [base / f"{slug}.md", base / slug / "SKILL.md"]
    for path in candidates:
        if path.is_file():
            return parse_skill_markdown(path.read_text(encoding="utf-8"))
    return None


def _parsed_from_api(data: dict) -> ParsedSkill:
    content = str(data.get("content") or "").strip()
    if content.startswith("---"):
        parsed = parse_skill_markdown(content)
        if parsed.name != "unknown":
            return parsed
    name = str(data.get("name") or data.get("slug") or "unknown").strip() or "unknown"
    tools_raw = data.get("tools")
    tools: list[str] = []
    if isinstance(tools_raw, list):
        tools = [str(item).strip() for item in tools_raw if str(item).strip()]
    return ParsedSkill(
        name=name,
        version=str(data.get("version") or "1"),
        description=str(data.get("description") or "").strip(),
        tools=tools,
        body=content,
        locale=str(data.get("locale") or "zh").strip() or "zh",
    )


def _skill_ref(inp: SkillInput) -> tuple[str, str, str]:
    skill_id = (inp.skill_id or "").strip()
    if skill_id:
        return skill_id, skill_id, "api"
    name = (inp.skill or "").strip().replace("/", "").replace("\\", "")
    return name, name, "bundled"


async def invoke_skill(ctx: AgentRunContext, inp: SkillInput) -> ToolCallResult:
    ref_id, display_name, source = _skill_ref(inp)
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

    parsed: ParsedSkill | None = None
    api_id = str(ref_id)
    try:
        if source == "api":
            data = await skill_api.fetch_skill(ref_id, ctx.user_id)
            parsed = _parsed_from_api(data)
            api_id = str(data.get("id") or ref_id)
            display_name = parsed.name or display_name
        else:
            parsed = read_bundled_skill(ref_id) or _read_legacy_skill(ref_id)
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

    if parsed is None:
        err = f"skill not found: {display_name}"
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

    body = (parsed.body or "")[:8000]
    merged_prompt = _append_skill_prompt(ctx, body)
    events.append(
        emit_skill_loaded(
            ctx,
            skill_id=api_id,
            name=parsed.name,
            sequence=seq,
            step_id=step_id,
        )
    )
    return ToolCallResult(
        content=json.dumps({"skill": parsed.name, "loaded": True}, ensure_ascii=False),
        context_patch={
            "skill_prompt": merged_prompt,
            "last_skill": parsed.name,
        },
        sse_events=events,
    )


SKILL_TOOLS = [
    build_tool(
        name="Skill",
        description=(
            "Load a skill prompt fragment into context. "
            "Use skill_id for user/system skills from novel-studio, "
            "or skill for bundled slugs under python-ai/skills/bundled/."
        ),
        input_model=SkillInput,
        call=invoke_skill,
        is_enabled=lambda _c: _skill_sources_available(),
    ),
]
