"""Sequential crew stage orchestrator (Python-side)."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any, Awaitable, Callable

from app.agent.harness.crew_models import (
    CrewContext,
    CrewResult,
    CrewStageDef,
    CrewTemplate,
)
from app.agent.schemas import AgentRunContext
from app.config import settings

logger = logging.getLogger(__name__)

EmitFn = Callable[[dict[str, Any]], Awaitable[None]]


def _fixtures_root() -> Path:
    return Path(__file__).resolve().parents[3] / "tests" / "fixtures" / "crew"


def _stage_from_dict(raw: dict[str, Any]) -> CrewStageDef:
    return CrewStageDef(
        key=str(raw.get("key") or "").strip(),
        profile_id=str(raw.get("profile_id") or raw.get("profileId") or "").strip(),
        prompt_template=str(
            raw.get("prompt_template") or raw.get("promptTemplate") or ""
        ).strip(),
        output_schema=str(raw.get("output_schema") or raw.get("outputSchema") or "none").strip(),
        gate=str(raw.get("gate") or "always").strip(),
        on_fail=str(raw.get("on_fail") or raw.get("onFail") or "abort_with_report").strip(),
    )


def template_from_dict(data: dict[str, Any]) -> CrewTemplate:
    stages_raw = data.get("stages") or data.get("stages_json") or data.get("stagesJson") or []
    if isinstance(stages_raw, str):
        try:
            stages_raw = json.loads(stages_raw)
        except json.JSONDecodeError:
            stages_raw = []
    stages = [_stage_from_dict(s) for s in stages_raw if isinstance(s, dict)]
    tpl_id = str(data.get("id") or "").strip()
    return CrewTemplate(
        id=tpl_id,
        display_name=str(data.get("display_name") or data.get("displayName") or "").strip(),
        description=str(data.get("description") or "").strip(),
        stages=[s for s in stages if s.key and s.profile_id],
    )


def load_fixture_template(crew_id: str) -> CrewTemplate | None:
    slug = (crew_id or "").strip().replace("/", "").replace("\\", "")
    if not slug:
        return None
    for name in (f"{slug}.json", f"{slug.replace('-', '_')}.json"):
        path = _fixtures_root() / name
        if path.is_file():
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            if isinstance(data, dict):
                tpl = template_from_dict(data)
                if not tpl.id:
                    return CrewTemplate(
                        id=slug,
                        display_name=tpl.display_name,
                        stages=tpl.stages,
                        description=tpl.description,
                    )
                return tpl
    return None


def render_prompt(
    template: str,
    *,
    crew_ctx: CrewContext,
    crew_vars: dict[str, Any] | None,
) -> str:
    text = template or ""
    merged: dict[str, Any] = {}
    if crew_vars:
        merged.update(crew_vars)
    for key, value in crew_ctx.stage_outputs.items():
        if isinstance(value, dict):
            merged[key] = value
    pattern = re.compile(r"\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}")

    def repl(match: re.Match[str]) -> str:
        path = match.group(1)
        parts = path.split(".")
        cur: Any = merged
        for part in parts:
            if isinstance(cur, dict) and part in cur:
                cur = cur[part]
            else:
                return match.group(0)
        if cur is None:
            return ""
        return str(cur)

    return pattern.sub(repl, text)


def _plan_output_valid(output: Any) -> bool:
    if not isinstance(output, dict):
        return False
    if output.get("status") == "FAIL":
        return False
    if output.get("ok") is False:
        return False
    if output.get("output_schema") == "PlanResult":
        return bool(output.get("summary") or output.get("plan"))
    return bool(output.get("summary") or output.get("content") or output.get("ok", True))


def _write_output_success(output: Any) -> bool:
    if not isinstance(output, dict):
        return False
    if output.get("status") == "FAIL" or output.get("ok") is False:
        return False
    if output.get("write_chapter_success"):
        return True
    artifacts = output.get("artifacts")
    if isinstance(artifacts, list):
        for item in artifacts:
            if isinstance(item, dict) and item.get("tool") == "WriteChapter" and item.get("ok"):
                return True
    tools = output.get("tools")
    if isinstance(tools, list) and "WriteChapter" in tools:
        return True
    return bool(output.get("summary") or output.get("content"))


def evaluate_gate(stage: CrewStageDef, crew_ctx: CrewContext, prev_stage: CrewStageDef | None) -> bool:
    gate = (stage.gate or "always").strip()
    if gate == "always":
        return True
    if prev_stage is None:
        return False
    prev_out = crew_ctx.stage_outputs.get(prev_stage.key)
    if gate == "on_plan_success":
        return _plan_output_valid(prev_out)
    if gate == "on_write_success":
        return _write_output_success(prev_out)
    return True


class CrewOrchestrator:
    def __init__(
        self,
        *,
        run_stage_fn=None,
        fetch_template_fn=None,
    ) -> None:
        self._run_stage_fn = run_stage_fn
        self._fetch_template_fn = fetch_template_fn

    async def _fetch_template(self, ctx: AgentRunContext) -> CrewTemplate | None:
        crew_id = (ctx.crew_id or "").strip()
        if not crew_id:
            return None
        if self._fetch_template_fn is not None:
            data = await self._fetch_template_fn(crew_id, ctx.user_id)
            return template_from_dict(data) if isinstance(data, dict) else data
        try:
            from app.agent.backend import crew_api

            data = await crew_api.fetch_crew_template(crew_id, ctx.user_id)
            return template_from_dict(data)
        except Exception as exc:
            logger.info("crew HTTP fetch failed id=%s: %s", crew_id, exc)
            tmpl_raw = ctx.context_patch.get("crew_template") if isinstance(ctx.context_patch, dict) else None
            if isinstance(tmpl_raw, dict):
                return template_from_dict(tmpl_raw)
            return load_fixture_template(crew_id)

    async def _default_run_stage(
        self,
        ctx: AgentRunContext,
        *,
        stage: CrewStageDef,
        prompt: str,
    ) -> dict[str, Any]:
        from app.agent.harness.subagent import run_subagent

        result = await run_subagent(
            ctx,
            description=stage.key,
            prompt=prompt,
            profile_id=stage.profile_id,
        )
        return {
            "summary": (result.content or "")[:8000],
            "ok": not result.is_error,
            "status": "FAIL" if result.is_error else "PASS",
            "context_patch": result.context_patch or {},
        }

    async def run(
        self,
        ctx: AgentRunContext,
        emit: EmitFn | None = None,
    ) -> tuple[CrewResult, list[dict[str, Any]]]:
        events: list[dict[str, Any]] = []

        async def _emit(ev: dict[str, Any]) -> None:
            events.append(ev)
            if emit is not None:
                await emit(ev)

        if not settings.agent_crew_enabled or not (ctx.crew_id or "").strip():
            return CrewResult.skipped(), events

        template = await self._fetch_template(ctx)
        if template is None or not template.stages:
            report = f"crew template not found: {ctx.crew_id}"
            logger.warning(report)
            return CrewResult.failed(report), events

        crew_ctx = CrewContext(template=template)
        from app.agent.harness.events import (
            emit_crew_completed,
            emit_crew_failed,
            emit_crew_stage_completed,
            emit_crew_stage_started,
            emit_crew_started,
        )

        await _emit(
            emit_crew_started(
                ctx,
                crew_id=template.id,
                display_name=template.display_name,
                stage_count=len(template.stages),
                sequence=len(events),
            )
        )

        run_stage = self._run_stage_fn or self._default_run_stage
        prev_stage: CrewStageDef | None = None
        patched_ctx = ctx.model_copy(update={"crew_id": None})

        for index, stage in enumerate(template.stages):
            if not evaluate_gate(stage, crew_ctx, prev_stage):
                logger.info("crew gate skipped stage=%s gate=%s", stage.key, stage.gate)
                prev_stage = stage
                continue

            crew_ctx.current_stage_key = stage.key
            prompt = render_prompt(
                stage.prompt_template,
                crew_ctx=crew_ctx,
                crew_vars=ctx.crew_vars if isinstance(ctx.crew_vars, dict) else {},
            )
            if not prompt.strip():
                prompt = (ctx.user_message or "").strip()

            await _emit(
                emit_crew_stage_started(
                    ctx,
                    stage_key=stage.key,
                    profile_id=stage.profile_id,
                    index=index,
                    sequence=len(events),
                )
            )

            output = await run_stage(patched_ctx, stage=stage, prompt=prompt)
            crew_ctx.stage_outputs[stage.key] = output
            status = str(output.get("status") or ("FAIL" if output.get("ok") is False else "PASS"))
            summary = str(output.get("summary") or output.get("content") or "")[:500]

            await _emit(
                emit_crew_stage_completed(
                    ctx,
                    stage_key=stage.key,
                    status=status,
                    summary=summary,
                    sequence=len(events),
                )
            )

            cp = output.get("context_patch")
            if isinstance(cp, dict):
                patch = dict(patched_ctx.context_patch or {})
                patch.update(cp)
                patched_ctx = patched_ctx.model_copy(update={"context_patch": patch})
                try:
                    from app.agent.backend import chapter_client

                    fresh = await chapter_client.fetch_chapter_summaries(patched_ctx)
                    if fresh:
                        patch = dict(patched_ctx.context_patch or {})
                        patch["chapters"] = fresh
                        patch["catalog_stale"] = False
                        patched_ctx = patched_ctx.model_copy(update={"context_patch": patch})
                except Exception as exc:
                    logger.warning("crew catalog refresh failed: %s", exc)

            if status == "FAIL" and stage.on_fail == "abort_with_report":
                report = summary or f"stage {stage.key} failed"
                await _emit(
                    emit_crew_failed(
                        ctx,
                        crew_id=template.id,
                        report=report,
                        sequence=len(events),
                    )
                )
                return CrewResult.failed(report, crew_ctx.stage_outputs), events

            prev_stage = stage

        await _emit(
            emit_crew_completed(
                ctx,
                crew_id=template.id,
                stage_outputs=crew_ctx.stage_outputs,
                sequence=len(events),
            )
        )
        return CrewResult.completed(crew_ctx.stage_outputs), events
