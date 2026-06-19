"""API routes for Novel AI Service."""
import logging

logger = logging.getLogger(__name__)

from fastapi import APIRouter, HTTPException

from app import __version__
from app.core.llm import LLMError, generate_text, llm_provider
from app.core.prompts import (
    DIALOGUE_SYSTEM,
    OUTLINE_SYSTEM,
    REVIEW_SYSTEM,
    REWRITE_SYSTEM,
    dialogue_prompt,
    outline_prompt,
    review_prompt,
    rewrite_prompt,
)
from app.models.schemas import (
    ConfigResponse,
    DialogueRequest,
    DialogueResponse,
    GenerationCandidate,
    HealthResponse,
    LLMProviderConfig,
    OutlineRequest,
    OutlineResponse,
    ReviewRequest,
    ReviewResponse,
    RewriteRequest,
    RewriteResponse,
)
from app.models.schemas import (
    ConfigResponse,
    DialogueRequest,
    DialogueResponse,
    GenerationCandidate,
    HealthResponse,
    LLMProviderConfig,
    OutlineRequest,
    OutlineResponse,
    ReviewRequest,
    ReviewResponse,
    RewriteRequest,
    RewriteResponse,
)
from app.tools.content_filter import ContentFilter

router = APIRouter()
content_filter = ContentFilter()


def parse_candidates(text: str, count: int = 3) -> list[GenerationCandidate]:
    """Parse LLM response into structured candidates."""
    candidates = []
    lines = text.strip().split('\n')

    current_content = []
    current_id = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if line.startswith('【') or line.startswith('['):
            # Save previous candidate
            if current_id is not None and current_content:
                content = '\n'.join(current_content).strip()
                if content:
                    candidates.append(GenerationCandidate(
                        id=current_id,
                        content=content,
                    ))

            # Parse new candidate
            if '1' in line:
                current_id = 1
            elif '2' in line:
                current_id = 2
            elif '3' in line:
                current_id = 3
            else:
                current_id = len(candidates) + 1

            current_content = []
        else:
            current_content.append(line)

    # Don't forget the last candidate
    if current_id is not None and current_content:
        content = '\n'.join(current_content).strip()
        if content:
            candidates.append(GenerationCandidate(
                id=current_id,
                content=content,
            ))

    # Fallback: if parsing failed, return the whole text as one candidate
    if not candidates:
        candidates.append(GenerationCandidate(
            id=1,
            content=text.strip(),
        ))

    return candidates[:count]


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check service health and configuration."""
    return HealthResponse(
        status="healthy",
        version=__version__,
        llm_configured=llm_provider.is_configured,
        active_provider=llm_provider.provider_name,
        current_model=llm_provider.current_model,
    )


@router.get("/config", response_model=ConfigResponse)
async def get_config():
    """Get current service configuration (sensitive data masked)."""
    from app.config import settings

    def mask_key(key: str) -> str:
        if len(key) <= 4:
            return "****"
        return key[:2] + "****" + key[-2:]

    providers = {}

    # OpenAI config
    if settings.openai_api_key:
        providers["openai"] = LLMProviderConfig(
            name="openai",
            api_key=mask_key(settings.openai_api_key),
            base_url=settings.openai_base_url,
            model=settings.openai_model,
            max_tokens=settings.openai_max_tokens,
            request_timeout=settings.openai_timeout,
        )

    # DeepSeek config
    if settings.deepseek_api_key:
        providers["deepseek"] = LLMProviderConfig(
            name="deepseek",
            api_key=mask_key(settings.deepseek_api_key),
            base_url=settings.deepseek_base_url,
            model=settings.deepseek_model,
            max_tokens=settings.deepseek_max_tokens,
            request_timeout=settings.deepseek_timeout,
        )

    return ConfigResponse(
        active_provider=settings.active_provider,
        available_providers=list(providers.keys()),
        providers=providers,
        milvus_host=settings.milvus_host,
        milvus_port=settings.milvus_port,
    )


@router.post("/config/switch")
async def switch_provider(provider: str):
    """
    Switch the active LLM provider.

    Args:
        provider: Provider name to switch to
    """
    from app.config import settings

    if provider not in ["openai", "deepseek"]:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

    api_key = getattr(settings, f"{provider}_api_key", None)
    if not api_key:
        raise HTTPException(status_code=400, detail=f"Provider {provider} not configured")

    settings.active_provider = provider
    llm_provider.switch_provider(provider)

    return {"status": "ok", "active_provider": provider}


async def rewrite_text(request: RewriteRequest):
    """
    Rewrite text according to user instructions.

    Returns 3 candidate rewrites.
    """
    if not llm_provider.is_configured:
        raise HTTPException(status_code=503, detail="LLM not configured")

    try:
        if content_filter.contains_problematic_content(request.original_text):
            raise HTTPException(status_code=400, detail="Input content contains sensitive material")

        prompt = rewrite_prompt(
            request.original_text,
            request.instructions,
        )

        response = await generate_text(
            prompt=prompt,
            system_message=REWRITE_SYSTEM,
            temperature=0.7,
        )

        filtered_response = content_filter.filter_text(response)
        candidates = parse_candidates(filtered_response)

        return RewriteResponse(candidates=candidates)

    except LLMError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}") from e


@router.post("/ai/outline", response_model=OutlineResponse)
async def generate_outline(request: OutlineRequest):
    """
    Generate a novel outline from a one-sentence summary.
    """
    if not llm_provider.is_configured:
        raise HTTPException(status_code=503, detail="LLM not configured")

    try:
        prompt = outline_prompt(
            request.summary,
            request.genre,
            request.style,
        )

        response = await generate_text(
            prompt=prompt,
            system_message=OUTLINE_SYSTEM,
            temperature=0.7,
        )

        return OutlineResponse(
            outline=response,
            structure=None,  # TODO: parse structured data
        )

    except LLMError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}") from e


@router.post("/ai/dialogue", response_model=DialogueResponse)
async def generate_dialogue(request: DialogueRequest):
    """
    Generate dialogue between two characters.
    """
    if not llm_provider.is_configured:
        raise HTTPException(status_code=503, detail="LLM not configured")

    try:
        prompt = dialogue_prompt(
            request.character_a,
            request.character_b,
            request.scene,
            request.context,
        )

        response = await generate_text(
            prompt=prompt,
            system_message=DIALOGUE_SYSTEM,
            temperature=0.8,
        )

        filtered_response = content_filter.filter_text(response)

        return DialogueResponse(dialogue=filtered_response)

    except LLMError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}") from e


@router.post("/ai/review", response_model=ReviewResponse)
async def review_content(request: ReviewRequest):
    """
    AI-powered proofreading and review.
    """
    if not llm_provider.is_configured:
        raise HTTPException(status_code=503, detail="LLM not configured")

    try:
        prompt = review_prompt(
            request.content,
            request.focus_areas,
        )

        response = await generate_text(
            prompt=prompt,
            system_message=REVIEW_SYSTEM,
            temperature=0.5,
        )

        # TODO: Parse structured response for issues and suggestions
        return ReviewResponse(
            issues=[],
            suggestions=[s.strip() for s in response.split('\n') if s.strip()],
            overall_quality=None,
        )

    except LLMError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}") from e
