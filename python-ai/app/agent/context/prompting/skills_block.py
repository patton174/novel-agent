"""Build RUN_CONTEXT skills block (CC catalog vs user-specified loaded body)."""

from __future__ import annotations

from typing import Any

from app.agent.context.skill_catalog import format_skills_within_budget

SKILLS_CATALOG_HINT = (
    "已启用的技能目录（仅元数据，类似 CC skill listing）。匹配用户任务时，"
    "必须先调用 Skill 工具加载完整指令后再执行。"
)
SKILLS_LOADED_HINT = (
    "用户已通过编辑器指定技能，或 Skill 工具已加载正文；请直接遵循 skills.loaded 中的指令。"
)
LOADED_SKILL_PROMPT_MAX = 8000


def resolve_skill_ids_and_prompt(
    skill_ids: list[Any],
    skill_prompt: str,
    context_patch: dict[str, Any],
) -> tuple[list[dict[str, Any]], str]:
    prompt = (skill_prompt or "").strip()
    if not prompt:
        patch_prompt = context_patch.get("skill_prompt")
        if isinstance(patch_prompt, str):
            prompt = patch_prompt.strip()

    rows = [row for row in (skill_ids or []) if isinstance(row, dict)]
    if not rows:
        patch_ids = context_patch.get("skill_ids")
        if isinstance(patch_ids, list):
            rows = [row for row in patch_ids if isinstance(row, dict)]
    return rows, prompt


def build_skills_block(
    skill_ids: list[dict[str, Any]],
    skill_prompt: str,
) -> dict[str, Any] | None:
    """Catalog for discovery; omit catalog when body already loaded (user `#` or Skill tool)."""
    if not skill_ids and not skill_prompt:
        return None

    block: dict[str, Any] = {}
    active = [str(row.get("name") or "").strip() for row in skill_ids if row.get("name")]
    if active:
        block["active"] = active

    if skill_prompt:
        block["loaded"] = skill_prompt[:LOADED_SKILL_PROMPT_MAX]
        block["hint"] = SKILLS_LOADED_HINT
    else:
        catalog = format_skills_within_budget(skill_ids)
        if catalog:
            block["catalog"] = catalog
        block["hint"] = SKILLS_CATALOG_HINT

    return block or None
