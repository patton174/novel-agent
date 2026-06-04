"""API routes for Novel AI Service."""
import logging

logger = logging.getLogger(__name__)

from fastapi import APIRouter, HTTPException, Request, Header
from fastapi.responses import StreamingResponse

from app.models.schemas import (
    ContinueRequest,
    RewriteRequest,
    OutlineRequest,
    DialogueRequest,
    ReviewRequest,
    ContinueResponse,
    RewriteResponse,
    OutlineResponse,
    DialogueResponse,
    ReviewResponse,
    GenerationCandidate,
    HealthResponse,
    ConfigResponse,
    LLMProviderConfig,
)
from app.core.llm import generate_text, generate_text_stream, llm_provider, LLMError
from app.runtime.story_memory import get_story_memory, patch_story_memory
from app.core.prompts import (
    CONTINUATION_SYSTEM,
    REWRITE_SYSTEM,
    OUTLINE_SYSTEM,
    DIALOGUE_SYSTEM,
    REVIEW_SYSTEM,
    continuation_prompt,
    rewrite_prompt,
    outline_prompt,
    dialogue_prompt,
    review_prompt,
)
from app.tools.content_filter import ContentFilter
from app import __version__

router = APIRouter()
content_filter = ContentFilter()


@router.get("/agent/memory/novel/{novel_id}")
async def get_agent_novel_story_memory(
    novel_id: str,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
):
    """Get long-term story memory for a novel."""
    if not novel_id.strip():
        raise HTTPException(status_code=400, detail="novel_id is required")
    user_id: int | None = None
    if x_user_id and x_user_id.strip().isdigit():
        user_id = int(x_user_id.strip())
    return {
        "novel_id": novel_id,
        "memory": get_story_memory("", user_id=user_id, novel_id=novel_id),
    }


@router.post("/agent/memory/novel/{novel_id}/patch")
async def patch_agent_novel_story_memory(
    novel_id: str,
    body: dict,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
):
    """Patch long-term story memory for a novel."""
    if not novel_id.strip():
        raise HTTPException(status_code=400, detail="novel_id is required")
    user_id: int | None = None
    if x_user_id and x_user_id.strip().isdigit():
        user_id = int(x_user_id.strip())
    scope = str(body.get("scope") or "").strip()
    key = str(body.get("key") or "").strip()
    value = str(body.get("value") or "").strip()
    item_id_raw = body.get("item_id")
    item_id = str(item_id_raw).strip() if item_id_raw is not None else None
    result = patch_story_memory(
        "",
        scope=scope,
        key=key,
        value=value,
        item_id=item_id,
        user_id=user_id,
        novel_id=novel_id,
    )
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=str(result.get("reason") or "patch failed"))
    return {"novel_id": novel_id, **result, "memory": get_story_memory("", user_id=user_id, novel_id=novel_id)}


@router.get("/agent/memory/{session_id}")
async def get_agent_story_memory(
    session_id: str,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
):
    """Get long-term story memory for a session."""
    if not session_id.strip():
        raise HTTPException(status_code=400, detail="session_id is required")
    user_id: int | None = None
    if x_user_id and x_user_id.strip().isdigit():
        user_id = int(x_user_id.strip())
    return {"session_id": session_id, "memory": get_story_memory(session_id, user_id=user_id)}


@router.post("/agent/memory/{session_id}/patch")
async def patch_agent_story_memory(session_id: str, body: dict):
    """Patch long-term story memory for a session."""
    if not session_id.strip():
        raise HTTPException(status_code=400, detail="session_id is required")
    scope = str(body.get("scope") or "").strip()
    key = str(body.get("key") or "").strip()
    value = str(body.get("value") or "").strip()
    item_id_raw = body.get("item_id")
    item_id = str(item_id_raw).strip() if item_id_raw is not None else None
    result = patch_story_memory(
        session_id,
        scope=scope,
        key=key,
        value=value,
        item_id=item_id,
    )
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=str(result.get("reason") or "patch failed"))
    return {"session_id": session_id, **result, "memory": get_story_memory(session_id)}


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


@router.post("/ai/continue", response_model=ContinueResponse)
async def continue_story(request: ContinueRequest):
    """
    Continue a chapter from the provided content.

    Returns 3 candidate continuations.
    """
    if not llm_provider.is_configured:
        raise HTTPException(status_code=503, detail="LLM not configured")

    try:
        # Apply content filter to input
        if content_filter.contains_problematic_content(request.content):
            raise HTTPException(status_code=400, detail="Input content contains sensitive material")

        prompt = continuation_prompt(
            request.content,
            request.style,
            request.word_count,
        )

        response = await generate_text(
            prompt=prompt,
            system_message=CONTINUATION_SYSTEM,
            temperature=0.7,
        )

        # Filter output
        filtered_response = content_filter.filter_text(response)

        candidates = parse_candidates(filtered_response)

        return ContinueResponse(
            candidates=candidates,
            used_context=False,  # TODO: integrate vector search
        )

    except LLMError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}") from e


async def sse_stream(prompt: str, system_message: str, task_id: str = "default") -> StreamingResponse:
    """
    Create a Server-Sent Events streaming response.
    """
    print(f">>>>>> sse_stream ENTERED, task_id={task_id} <<<<<<", flush=True)

    async def event_generator():
        print(f">>>>>> event_generator STARTED, task_id={task_id} <<<<<<", flush=True)
        logger.info(f"=== sse_stream called with task_id: {task_id} ===")
        yield f"event: start\ndata: {task_id}\n\n"

        try:
            async for chunk in generate_text_stream(prompt=prompt, system_message=system_message):
                clean = chunk.replace("<think>", "").replace("</think>", "").strip()
                if clean:
                    for line in clean.split('\n'):
                        if line:
                            yield f"data: {line}\n\n"
            yield f"event: end\ndata: done\n\n"
        except Exception as e:
            yield f"event: error\ndata: {str(e)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/ai/continue/stream")
async def continue_story_stream(request: ContinueRequest):
    """
    Continue a chapter with SSE streaming.

    Streams the response in Server-Sent Events format.
    """
    print(">>>>>> continue_story_stream ENTERED <<<<<<", flush=True)
    logger.info("=== continue_story_stream called ===")
    logger.info("=== after docstring ===")
    if not llm_provider.is_configured:
        raise HTTPException(status_code=503, detail="LLM not configured")

    if content_filter.contains_problematic_content(request.content):
        raise HTTPException(status_code=400, detail="Input content contains sensitive material")

    prompt = continuation_prompt(
        request.content,
        request.style,
        request.word_count,
    )

    return await sse_stream(prompt=prompt, system_message=CONTINUATION_SYSTEM, task_id="continue")


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
