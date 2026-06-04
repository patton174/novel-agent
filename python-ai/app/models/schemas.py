"""Pydantic schemas for request/response models."""

from typing import Any, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class ContinueRequest(BaseModel):
    """Request schema for chapter continuation."""

    content: str = Field(..., description="Previous chapter content")
    style: Optional[str] = Field(None, description="Writing style hint")
    word_count: Optional[int] = Field(1000, description="Target word count")
    novel_id: Optional[int] = Field(None, description="Novel ID for context retrieval")


class RewriteRequest(BaseModel):
    """Request schema for paragraph rewriting."""

    original_text: str = Field(..., description="Original text to rewrite")
    instructions: str = Field(..., description="Rewrite instructions")
    novel_id: Optional[int] = Field(None, description="Novel ID for context retrieval")


class OutlineRequest(BaseModel):
    """Request schema for novel outline generation."""

    summary: str = Field(..., description="One-sentence novel summary")
    genre: Optional[str] = Field(None, description="Novel genre")
    style: Optional[str] = Field(None, description="Writing style")


class DialogueRequest(BaseModel):
    """Request schema for character dialogue generation."""

    character_a: str = Field(..., description="First character name")
    character_b: str = Field(..., description="Second character name")
    scene: str = Field(..., description="Scene description")
    context: Optional[str] = Field(None, description="Additional context")
    novel_id: Optional[int] = Field(None, description="Novel ID for character lookup")


class ReviewRequest(BaseModel):
    """Request schema for AI proofreading."""

    content: str = Field(..., description="Content to review")
    focus_areas: Optional[list[str]] = Field(None, description="Specific areas to focus on")


class GenerationCandidate(BaseModel):
    """A single generation candidate."""

    id: int = Field(..., description="Candidate ID (1, 2, or 3)")
    content: str = Field(..., description="Generated content")
    score: Optional[float] = Field(None, description="Quality score if available")


class ContinueResponse(BaseModel):
    """Response schema for chapter continuation."""

    candidates: list[GenerationCandidate] = Field(..., description="List of generation candidates")
    used_context: bool = Field(False, description="Whether vector context was used")


class RewriteResponse(BaseModel):
    """Response schema for paragraph rewriting."""

    candidates: list[GenerationCandidate] = Field(..., description="List of rewrite candidates")


class OutlineResponse(BaseModel):
    """Response schema for outline generation."""

    outline: str = Field(..., description="Generated outline")
    structure: Optional[dict] = Field(None, description="Structured outline data")


class DialogueResponse(BaseModel):
    """Response schema for dialogue generation."""

    dialogue: str = Field(..., description="Generated dialogue")


class ReviewResponse(BaseModel):
    """Response schema for proofreading."""

    issues: list[dict] = Field(default_factory=list, description="List of identified issues")
    suggestions: list[str] = Field(default_factory=list, description="List of suggestions")
    overall_quality: Optional[str] = Field(None, description="Overall quality assessment")


class HealthResponse(BaseModel):
    """Response schema for health check."""

    status: str = Field(..., description="Service status")
    version: str = Field(..., description="Service version")
    llm_configured: bool = Field(..., description="Whether LLM is properly configured")
    active_provider: str = Field(..., description="Currently active LLM provider")
    current_model: str = Field(..., description="Current model name")


class LLMProviderConfig(BaseModel):
    """LLM provider configuration."""

    name: str = Field(..., description="Provider name (openai, deepseek, etc.)")
    api_key: str = Field(..., description="API key (masked)")
    base_url: Optional[str] = Field(None, description="Custom endpoint URL")
    model: str = Field(..., description="Model name")
    max_tokens: int = Field(4096, description="Max tokens")
    request_timeout: int = Field(30, description="Request timeout in seconds")


class ConfigResponse(BaseModel):
    """Response schema for service configuration."""

    active_provider: str
    available_providers: list[str]
    providers: dict[str, LLMProviderConfig]
    milvus_host: str
    milvus_port: int


class AgentTraceOptions(BaseModel):
    emit_think: bool = True
    emit_tool: bool = True
    emit_skill: bool = True
    emit_mcp: bool = True
    force_think: bool = False
    think_intensity: str = "medium"


class AgentUserContext(BaseModel):
    id: int
    roles: list[str] = Field(default_factory=list)


class AgentInputPayload(BaseModel):
    message: str
    mode: str = "auto"


class AgentExecutionRequest(BaseModel):
    run_id: str
    session_id: str
    message_id: str
    user: AgentUserContext
    input: AgentInputPayload
    context: dict = Field(default_factory=dict)
    trace: AgentTraceOptions = Field(default_factory=AgentTraceOptions)


class AgentChatRequest(BaseModel):
    """Request schema for agent chat."""

    message: str = Field(..., description="User message")
    context: Optional[str] = Field(None, description="Conversation context")
    use_tools: bool = Field(True, description="Whether to use agent tools")


class AgentChatResponse(BaseModel):
    """Response schema for agent chat."""

    response: str = Field(..., description="Agent response")
    tool_calls: Optional[list[dict]] = Field(default_factory=list, description="Tool calls made by agent")


def normalize_agent_execution_request(body: dict[str, Any]) -> AgentExecutionRequest:
    """
    Accept structured gateway requests or legacy agent chat payloads.
    """
    if {"run_id", "session_id", "message_id", "input"}.issubset(body.keys()):
        return AgentExecutionRequest.model_validate(body)

    legacy = AgentChatRequest.model_validate(body)
    context: dict[str, Any] = {}
    if legacy.context:
        context = {"text": legacy.context}

    trace = AgentTraceOptions()
    if not legacy.use_tools:
        trace = trace.model_copy(update={"emit_tool": False})

    return AgentExecutionRequest(
        run_id=f"run_{uuid4().hex}",
        session_id=f"session_{uuid4().hex}",
        message_id=f"message_{uuid4().hex}",
        user=AgentUserContext(id=0, roles=[]),
        input=AgentInputPayload(message=legacy.message, mode="auto"),
        context=context,
        trace=trace,
    )