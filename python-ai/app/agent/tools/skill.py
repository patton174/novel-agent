"""Skill loader tool — loads prompt fragments from skills directory."""

from __future__ import annotations

import json
from pathlib import Path

from app.agent.tools.schemas import SkillInput
from app.agent.schemas import AgentRunContext
from app.agent.tools.tool import ToolCallResult, build_tool
from app.config import settings


def _skills_dir() -> Path | None:
    raw = (settings.agent_skills_dir or "").strip()
    if not raw:
        return None
    path = Path(raw)
    return path if path.is_dir() else None


async def invoke_skill(ctx: AgentRunContext, inp: SkillInput) -> ToolCallResult:
    _ = ctx
    base = _skills_dir()
    if base is None:
        return ToolCallResult(
            content="<tool_use_error>请配置 AGENT_SKILLS_DIR 以启用 Skill 工具</tool_use_error>",
            is_error=True,
        )
    name = (inp.skill or "").strip().replace("/", "").replace("\\", "")
    candidates = [base / f"{name}.md", base / name / "SKILL.md"]
    for path in candidates:
        if path.is_file():
            text = path.read_text(encoding="utf-8")[:8000]
            return ToolCallResult(
                content=json.dumps({"skill": name, "loaded": True}, ensure_ascii=False),
                context_patch={"skill_prompt": text, "last_skill": name},
            )
    return ToolCallResult(
        content=f"<tool_use_error>skill not found: {name}</tool_use_error>", is_error=True
    )


SKILL_TOOLS = [
    build_tool(
        name="Skill",
        description="Load a named skill prompt fragment into context (requires AGENT_SKILLS_DIR).",
        input_model=SkillInput,
        call=invoke_skill,
        is_enabled=lambda _c: _skills_dir() is not None,
    ),
]
