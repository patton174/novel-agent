"""Pydantic models for agent step orchestration."""

from __future__ import annotations

import json
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


def _coerce_json_list(value: Any) -> list[Any] | None:
    """MiniMax 有时把 tool_calls 等字段序列化成 JSON 字符串而非 array。"""
    if isinstance(value, list):
        return value
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text:
        return []
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, list) else None


class DisplayPayload(BaseModel):
    type: Literal["think", "message", "tool", "none"]
    title: str | None = None
    content: str | None = None
    stream: bool = True
    tool: str | None = None
    choices: list[dict[str, Any]] | None = None
    interaction: dict[str, Any] | None = None


class StepResult(BaseModel):
    version: int = 1
    step_kind: str
    action: Literal["continue", "wait", "end"]
    wait_for: Literal["interaction"] | None = None
    next_tool: str = ""
    next_input: dict[str, Any]
    context_patch: dict[str, Any]
    display: DisplayPayload
    reason: str

    @model_validator(mode="before")
    @classmethod
    def _require_dict_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        if str(data.get("action") or "").strip() == "end":
            if not str(data.get("next_tool") or "").strip():
                data["next_tool"] = "end"
        for key in ("next_input", "context_patch"):
            if key not in data:
                raise ValueError(f"missing required field: {key}")
            if data[key] is None:
                raise ValueError(f"{key} must be a JSON object, not null")
            if not isinstance(data[key], dict):
                raise ValueError(f"{key} must be a JSON object")
        return data

    @model_validator(mode="after")
    def _validate_action(self) -> StepResult:
        if self.action == "end":
            if self.next_tool != "end":
                raise ValueError("action=end requires next_tool=end")
        if self.action == "wait" and self.wait_for != "interaction":
            raise ValueError("action=wait requires wait_for=interaction")
        return self


def _coerce_agent_run_context_nulls(data: Any) -> Any:
    """Java owner may send explicit null for fields with Python defaults."""
    if not isinstance(data, dict):
        return data
    for key in ("skill_prompt", "user_message", "chapter_text"):
        if data.get(key) is None:
            data[key] = ""
    if data.get("mode") is None:
        data["mode"] = "auto"
    for key in ("crew_vars", "preferences", "project", "context_patch"):
        if data.get(key) is None:
            data[key] = {}
    for key in ("history", "chapters", "referenced_books", "skill_ids"):
        if data.get(key) is None:
            data[key] = []
    return data


class AgentRunContext(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="before")
    @classmethod
    def _normalize_null_defaults(cls, data: Any) -> Any:
        return _coerce_agent_run_context_nulls(data)

    run_id: str
    session_id: str
    message_id: str
    user_id: int
    mode: str = "auto"
    user_message: str = ""
    chapter_text: str = ""
    history: list[dict[str, Any]] = Field(default_factory=list)
    preferences: dict[str, Any] = Field(default_factory=dict)
    project: dict[str, Any] = Field(default_factory=dict)
    chapters: list[dict[str, Any]] = Field(default_factory=list)
    current_chapter_id: str | None = None
    novel_id: str | None = None
    step_index: int = 0
    last_tool: str | None = None
    last_reason: str | None = None
    context_patch: dict[str, Any] = Field(default_factory=dict)
    selected_choice: dict[str, Any] | None = None
    referenced_books: list[dict[str, Any]] = Field(default_factory=list)
    skill_ids: list[dict[str, Any]] = Field(default_factory=list)
    skill_prompt: str = ""
    crew_id: str | None = None
    crew_vars: dict[str, Any] = Field(default_factory=dict)
    resolved_model: dict[str, Any] | None = Field(default=None, alias="model_config")

    def merged_patch(self) -> dict[str, Any]:
        return dict(self.context_patch)


class StepRequest(BaseModel):
    context: AgentRunContext
    tool: str | None = None
    tool_input: dict[str, Any] = Field(default_factory=dict)


class RunRequest(BaseModel):
    context: AgentRunContext


class PlanRequest(BaseModel):
    context: AgentRunContext
    think_content: str = ""
    think_tool_input: dict[str, Any] = Field(default_factory=dict)
    transcript: list[dict[str, Any]] = Field(default_factory=list)


class AskUserQuestionOption(BaseModel):
    id: str = ""
    title: str
    description: str = ""


class AskUserQuestionItem(BaseModel):
    id: str
    prompt: str
    type: Literal["single_select", "multi_select", "user_input"] = "single_select"
    options: list[AskUserQuestionOption] | None = None
    allow_custom: bool = False
    free_text_hint: str | None = None


class AskUserQuestionsOutput(BaseModel):
    """ask_user 问题列表由 forced tool 返回，而非裸 JSON 数组。"""

    questions: list[AskUserQuestionItem] = Field(default_factory=list)


class PlanToolCall(BaseModel):
    tool: str
    input: dict[str, Any] = Field(default_factory=dict)


class PlanResult(BaseModel):
    version: int = 2
    action: Literal["continue", "wait", "end"]
    wait_for: Literal["interaction"] | None = None
    next_tool: str = ""
    next_input: dict[str, Any] = Field(default_factory=dict)
    tool_calls: list[PlanToolCall] = Field(default_factory=list)
    """一批待执行工具；非空时 Java 按序执行，默认不再逐步 plan。"""
    continue_plan: bool = False
    """false/省略：本批工具跑完后直接 output，不再编排；true：本批后再次 plan。"""
    context_patch: dict[str, Any] = Field(default_factory=dict)
    reason: str
    routing_source: Literal["llm", "heuristic"] = "heuristic"

    @model_validator(mode="before")
    @classmethod
    def _require_plan_dict_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        if "next_input" not in data or data["next_input"] is None:
            data["next_input"] = {}
        if "context_patch" not in data or data["context_patch"] is None:
            data["context_patch"] = {}
        elif not isinstance(data["context_patch"], dict):
            data["context_patch"] = {}
        if not str(data.get("action") or "").strip():
            data["action"] = "continue"
        if not str(data.get("reason") or "").strip():
            data["reason"] = str(data.get("reason") or "")

        if str(data.get("action") or "").strip() == "end":
            if not str(data.get("next_tool") or "").strip():
                data["next_tool"] = "end"

        if isinstance(data.get("next_input"), str):
            data["next_input"] = {"hint": data["next_input"]}

        raw_calls = data.get("tool_calls")
        coerced_calls = _coerce_json_list(raw_calls)
        if coerced_calls is not None:
            raw_calls = coerced_calls
            data["tool_calls"] = coerced_calls
        calls: list[dict[str, Any]] = []
        if isinstance(raw_calls, list):
            for item in raw_calls:
                if not isinstance(item, dict):
                    continue
                tool = str(item.get("tool") or "").strip()
                if not tool:
                    continue
                inp = item.get("input")
                if isinstance(inp, str):
                    inp = {"hint": inp}
                calls.append(
                    {
                        "tool": tool,
                        "input": inp if isinstance(inp, dict) else {},
                    }
                )
        if calls:
            data["tool_calls"] = calls
            if not str(data.get("next_tool") or "").strip():
                data["next_tool"] = calls[0]["tool"]
            if not data.get("next_input"):
                data["next_input"] = calls[0].get("input") or {}
        elif str(data.get("next_tool") or "").strip():
            data["tool_calls"] = [
                {
                    "tool": str(data["next_tool"]).strip(),
                    "input": data.get("next_input")
                    if isinstance(data.get("next_input"), dict)
                    else {},
                }
            ]

        if "continue_plan" not in data:
            data["continue_plan"] = False

        return data

    @model_validator(mode="after")
    def _validate_raw_plan_tool_inputs(self) -> PlanResult:
        from app.agent.tools.registry import find_tool_by_name

        def _check(tool: str, inp: dict[str, Any]) -> None:
            t = find_tool_by_name(tool)
            if t is None:
                raise ValueError(f"No such tool available: {tool}")
            _, err = t.parse_input(inp)
            if err:
                raise ValueError(f"InputValidationError: {err}")

        for call in self.tool_calls:
            _check(call.tool, dict(call.input or {}))
        if self.tool_calls:
            return self
        if str(self.next_tool or "").strip():
            _check(self.next_tool, dict(self.next_input or {}))
        return self

    @model_validator(mode="after")
    def _validate_plan_action(self) -> PlanResult:
        if self.action == "wait" and self.wait_for != "interaction":
            raise ValueError("action=wait requires wait_for=interaction")
        if self.action == "end":
            if self.next_tool != "end":
                raise ValueError("action=end requires next_tool=end")
            return self
        if self.action == "continue":
            if self.tool_calls:
                return self
            if not (self.next_tool or "").strip():
                raise ValueError("action=continue requires next_tool or tool_calls")
        return self
