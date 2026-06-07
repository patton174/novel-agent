"""Per-tool LLM streaming policy: expose model reasoning vs fast concise path."""

from __future__ import annotations

from dataclasses import dataclass

from app.core.llm import LLMProfile

_CONCISE_HINT = (
    "直接给出结果，推理尽量简短；禁止输出冗长的思考过程或分析铺垫。"
)


@dataclass(frozen=True)
class LlmStreamPolicy:
    """Controls model-reasoning SSE and LLM profile selection for a tool step."""

    emit_model_reasoning: bool = False
    profile: LLMProfile = "default"
    concise: bool = False

    @property
    def concise_system_hint(self) -> str:
        return _CONCISE_HINT if self.concise else ""


TOOL_LLM_POLICIES: dict[str, LlmStreamPolicy] = {
    "think": LlmStreamPolicy(emit_model_reasoning=False, profile="default"),
    "output": LlmStreamPolicy(emit_model_reasoning=False, concise=True),
    "ask_user": LlmStreamPolicy(emit_model_reasoning=False, profile="fast", concise=True),
    "choose": LlmStreamPolicy(emit_model_reasoning=False, profile="fast", concise=True),
    "chapter_create": LlmStreamPolicy(emit_model_reasoning=False, concise=True),
    "chapter_update": LlmStreamPolicy(emit_model_reasoning=False, concise=True),
}


def llm_policy_for_tool(tool_name: str) -> LlmStreamPolicy:
    return TOOL_LLM_POLICIES.get(tool_name, LlmStreamPolicy())


def llm_policy_for_output(tool_input: dict | None) -> LlmStreamPolicy:
    """Progress output uses a faster profile; complete uses default."""
    from app.agent.context.prompting.output_input import resolve_output_mode

    mode = resolve_output_mode(tool_input or {})
    if mode == "progress":
        return LlmStreamPolicy(emit_model_reasoning=False, profile="fast", concise=True)
    return TOOL_LLM_POLICIES.get("output", LlmStreamPolicy(concise=True))
