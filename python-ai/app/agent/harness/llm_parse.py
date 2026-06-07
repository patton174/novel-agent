"""Parse StepResult from LLM output (handles thinking tags + embedded JSON)."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from langchain_core.messages import BaseMessage

from app.agent.harness.structured_llm import invoke_structured_with_retry
from app.agent.schemas import DisplayPayload, StepResult
from app.core.llm import llm_provider
from app.core.llm_content import extract_llm_text
from app.core.llm_stream_policy import llm_policy_for_tool
from app.runtime.text_sanitize import extract_visible_text, strip_think_markup

logger = logging.getLogger(__name__)

_THINKING_INNER = re.compile(
    r"<think>([\s\S]*?)</think>",
    re.IGNORECASE,
)


def _json_candidates(text: str) -> list[str]:
    """Collect parse candidates; control JSON may live inside think blocks."""
    raw = (text or "").strip()
    if not raw:
        return []

    candidates: list[str] = [raw, strip_think_markup(raw)]
    for block in _THINKING_INNER.findall(raw):
            block = (block or "").strip()
            if block:
                candidates.append(block)

    seen: set[str] = set()
    unique: list[str] = []
    for item in candidates:
        if item not in seen:
            seen.add(item)
            unique.append(item)
    return unique


def _strip_code_fence(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```\s*$", "", cleaned)
    return cleaned.strip()


def _parse_dict_from_text(text: str) -> dict[str, Any] | None:
    cleaned = _strip_code_fence(text)
    if not cleaned:
        return None
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        try:
            parsed = json.loads(cleaned[start : end + 1])
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            return None
    return None


def _parse_list_from_text(text: str) -> list[Any] | None:
    cleaned = _strip_code_fence(text)
    if not cleaned:
        return None
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list):
            return parsed
    except json.JSONDecodeError:
        pass

    start = cleaned.find("[")
    end = cleaned.rfind("]")
    if start >= 0 and end > start:
        try:
            parsed = json.loads(cleaned[start : end + 1])
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            return None
    return None


def extract_json_array(text: str) -> list[Any]:
    for candidate in _json_candidates(text):
        data = _parse_list_from_text(candidate)
        if data is not None:
            return data
    raise ValueError("no JSON array found in LLM output")


def extract_json_object(text: str) -> dict[str, Any]:
    for candidate in _json_candidates(text):
        data = _parse_dict_from_text(candidate)
        if data is not None:
            return data
    raise ValueError("no JSON object found in LLM output")


def normalize_step_result_dict(data: dict[str, Any]) -> dict[str, Any]:
    """Best-effort repair of common LLM StepResult shape mistakes before validation."""
    if not isinstance(data, dict):
        return data
    out = dict(data)
    if not str(out.get("reason") or "").strip():
        out["reason"] = "step done"
    if out.get("next_input") is None:
        out["next_input"] = {}
    if out.get("context_patch") is None:
        out["context_patch"] = {}
    elif isinstance(out.get("context_patch"), str):
        out["context_patch"] = {}
    display = out.get("display")
    if display is None:
        out["display"] = {"type": "none", "content": ""}
    return out


_TERMINAL_PLAN_TOOLS = frozenset(
    {"output", "ask_user", "choose", "chapter_create", "chapter_update", "end"}
)


def _normalize_plan_tool_call(item: dict[str, Any]) -> dict[str, Any] | None:
    if not isinstance(item, dict):
        return None
    tool = ""
    inp: Any = {}
    if item.get("tool"):
        tool = str(item.get("tool") or "").strip()
        inp = item.get("input")
    elif len(item) == 1:
        tool_name, inp = next(iter(item.items()))
        tool = str(tool_name).strip()
    if not tool:
        return None
    if tool in _TERMINAL_PLAN_TOOLS:
        if isinstance(inp, str) and inp.strip():
            text = inp.strip()
            if tool == "output":
                inp = {"task": text}
            elif tool in ("ask_user", "choose"):
                inp = {"topic": text}
            else:
                inp = {}
        elif not isinstance(inp, dict):
            inp = {}
    elif not isinstance(inp, dict):
        inp = {}
    return {"tool": tool, "input": dict(inp)}


def normalize_plan_dict(data: dict[str, Any]) -> dict[str, Any]:
    """Best-effort repair of common LLM PlanResult shape mistakes before validation."""
    if not isinstance(data, dict):
        return data
    out = dict(data)
    if not str(out.get("action") or "").strip():
        out["action"] = "continue"
    if isinstance(out.get("context_patch"), str):
        out["context_patch"] = {}
    elif out.get("context_patch") is None:
        out["context_patch"] = {}
    next_tool = str(out.get("next_tool") or "").strip()
    raw_input = out.get("next_input")
    if isinstance(raw_input, str):
        text = raw_input.strip()
        if next_tool in ("output", "ask_user", "choose"):
            out["next_input"] = {"task": text} if next_tool == "output" else {"topic": text}
        else:
            out["next_input"] = {}
    raw_calls = out.get("tool_calls")
    if isinstance(raw_calls, list):
        fixed: list[dict[str, Any]] = []
        for item in raw_calls:
            call = _normalize_plan_tool_call(item) if isinstance(item, dict) else None
            if call:
                fixed.append(call)
        if fixed:
            out["tool_calls"] = fixed
            if not next_tool:
                out["next_tool"] = fixed[0]["tool"]
            if not out.get("next_input"):
                out["next_input"] = fixed[0].get("input") or {}
    return out


def _parse_tool_call_object(fragment: str) -> dict[str, Any] | None:
    """Parse one tool_calls[] element; tolerate string input and minor JSON damage."""
    text = (fragment or "").strip()
    if not text:
        return None
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    tool_m = re.search(r'"tool"\s*:\s*"([^"]+)"', text)
    if not tool_m:
        return None
    tool = tool_m.group(1).strip()
    obj_input = re.search(r'"input"\s*:\s*(\{.*\})\s*\}\s*$', text, re.DOTALL)
    if obj_input:
        try:
            inp = json.loads(obj_input.group(1))
            if isinstance(inp, dict):
                return {"tool": tool, "input": inp}
        except json.JSONDecodeError:
            pass
    str_input = re.search(r'"input"\s*:\s*"(.*)"\s*\}\s*$', text, re.DOTALL)
    if str_input:
        return {"tool": tool, "input": str_input.group(1)}
    return {"tool": tool, "input": {}}


def extract_plan_tool_calls_from_text(text: str) -> list[dict[str, Any]]:
    """Extract every tool_calls[] entry when the outer PlanResult JSON is not parseable."""
    raw = (text or "").strip()
    if not raw:
        return []
    marker = '"tool_calls"'
    pos = raw.find(marker)
    if pos < 0:
        return []
    arr_start = raw.find("[", pos)
    if arr_start < 0:
        return []
    calls: list[dict[str, Any]] = []
    i = arr_start + 1
    while i < len(raw):
        while i < len(raw) and raw[i] not in "{]":
            i += 1
        if i >= len(raw) or raw[i] == "]":
            break
        depth = 0
        start = i
        for j in range(i, len(raw)):
            ch = raw[j]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    parsed = _parse_tool_call_object(raw[start : j + 1])
                    if parsed:
                        call = _normalize_plan_tool_call(parsed)
                        if call:
                            calls.append(call)
                    i = j + 1
                    break
        else:
            break
    return calls


def build_plan_dict_from_tool_calls(
    calls: list[dict[str, Any]],
    *,
    source_text: str = "",
) -> dict[str, Any] | None:
    if not calls:
        return None
    reason = "parsed tool_calls batch"
    reason_m = re.search(r'"reason"\s*:\s*"([^"]*)"', source_text)
    if reason_m and reason_m.group(1).strip():
        reason = reason_m.group(1).strip()
    action = "continue"
    action_m = re.search(r'"action"\s*:\s*"([^"]+)"', source_text)
    if action_m and action_m.group(1).strip() in ("continue", "end", "wait"):
        action = action_m.group(1).strip()
    continue_plan = False
    cp_m = re.search(r'"continue_plan"\s*:\s*(true|false)', source_text, re.IGNORECASE)
    if cp_m:
        continue_plan = cp_m.group(1).lower() == "true"
    return normalize_plan_dict(
        {
            "action": action,
            "tool_calls": calls,
            "continue_plan": continue_plan,
            "reason": reason,
        }
    )


def _looks_like_plan_result(data: dict[str, Any]) -> bool:
    if not isinstance(data, dict):
        return False
    if "action" in data and str(data.get("action") or "").strip() in ("continue", "end", "wait"):
        return True
    if "tool_calls" in data or "next_tool" in data:
        return True
    return False


def extract_plan_json_from_text(text: str) -> dict[str, Any]:
    """Parse PlanResult JSON; tolerate reasoning-only wrappers and trailing JSON after think blocks."""
    for candidate in _json_candidates(text):
        data = _parse_dict_from_text(candidate)
        if data is not None and _looks_like_plan_result(data):
            return normalize_plan_dict(data)

    raw = (text or "").strip()
    for marker in ('"action"', "'action'", '"tool_calls"', '"next_tool"'):
        pos = raw.find(marker)
        if pos < 0:
            continue
        start = raw.rfind("{", 0, pos)
        if start < 0:
            continue
        depth = 0
        for i in range(start, len(raw)):
            ch = raw[i]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    try:
                        data = json.loads(raw[start : i + 1])
                        if isinstance(data, dict) and _looks_like_plan_result(data):
                            return normalize_plan_dict(data)
                    except json.JSONDecodeError:
                        break

    extracted = extract_plan_tool_calls_from_text(raw)
    rebuilt = build_plan_dict_from_tool_calls(extracted, source_text=raw)
    if rebuilt is not None:
        return rebuilt
    raise ValueError("no JSON object found in LLM output")


def sanitize_display_payload(display: DisplayPayload) -> DisplayPayload:
    """User-visible fields: strip think-tag inner content."""
    if display.type not in ("think", "message") or not display.content:
        return display
    cleaned = extract_visible_text(display.content)
    if cleaned == (display.content or "").strip():
        return display
    return display.model_copy(update={"content": cleaned or None})


def sanitize_step_result(result: StepResult) -> StepResult:
    display = sanitize_display_payload(result.display)
    if display is result.display:
        return result
    return result.model_copy(update={"display": display})


def _message_content(raw: Any) -> str:
    return extract_llm_text(raw, include_thinking=False)


async def invoke_step_result(
    messages: list[BaseMessage],
    *,
    step_kind: str,
) -> StepResult:
    """优先 forced StepResult tool；失败再回退文本 JSON 抽取。"""
    policy = llm_policy_for_tool(step_kind)
    try:
        result = await invoke_structured_with_retry(
            messages,
            StepResult,
            profile=policy.profile,
            retry_feedback_prefix="StepResult schema validation failed",
        )
        if result.step_kind != step_kind:
            result = result.model_copy(update={"step_kind": step_kind})
        return sanitize_step_result(result)
    except Exception as struct_exc:
        logger.info(
            "StepResult structured failed step_kind=%s, text fallback: %s",
            step_kind,
            struct_exc,
        )

    llm = llm_provider.get_llm(profile=policy.profile)
    raw = await llm.ainvoke(messages)
    content = _message_content(getattr(raw, "content", raw))
    data = normalize_step_result_dict(extract_json_object(content))
    try:
        result = StepResult.model_validate(data)
    except Exception as exc:
        logger.warning(
            "StepResult validation failed step_kind=%s keys=%s: %s",
            step_kind,
            list(data.keys()) if isinstance(data, dict) else type(data),
            exc,
        )
        raise
    if result.step_kind != step_kind:
        result = result.model_copy(update={"step_kind": step_kind})
    return sanitize_step_result(result)
