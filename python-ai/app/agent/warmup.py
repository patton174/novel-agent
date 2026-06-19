"""Agent runtime warmup — cut first-request latency after process/container start."""

from __future__ import annotations

import asyncio
import logging

from app.config import settings

logger = logging.getLogger(__name__)


async def warmup_agent_runtime() -> None:
    """Pre-load LLM clients, tool schemas, and optional dependency connections."""
    if not settings.agent_warmup_enabled:
        logger.info("Agent warmup disabled (AGENT_WARMUP_ENABLED=false)")
        return

    await asyncio.to_thread(_warmup_llm_and_tools)
    await _warmup_dependencies()


def _warmup_llm_and_tools() -> None:
    try:
        from app.core.llm import llm_provider

        if not llm_provider.is_configured:
            logger.info("Agent warmup skipped: LLM not configured")
            return

        llm_provider.get_llm(profile="default")
        llm_provider.get_llm(profile="plan")

        from app.agent.harness.orchestration_contract import build_main_loop_system_prompt
        from app.agent.tools.langchain_bind import build_agent_langchain_tools
        from app.core.llm_cache import cached_system_message

        build_main_loop_system_prompt()
        build_agent_langchain_tools()
        cached_system_message("warmup")

        logger.info(
            "Agent warmup: LLM profiles + %s tool schemas preloaded",
            len(build_agent_langchain_tools()),
        )
    except Exception as exc:
        logger.warning("Agent warmup LLM/tools failed: %s", exc)


async def _warmup_dependencies() -> None:
    tasks: list[asyncio.Task[None]] = []
    if settings.agent_warmup_content_ping:
        tasks.append(asyncio.create_task(_ping_content_api()))
    if settings.agent_warmup_milvus:
        tasks.append(asyncio.create_task(asyncio.to_thread(_connect_milvus)))
    if settings.agent_warmup_llm_ping and settings.is_llm_configured:
        tasks.append(asyncio.create_task(_ping_llm()))
    if not tasks:
        return
    results = await asyncio.gather(*tasks, return_exceptions=True)
    for result in results:
        if isinstance(result, Exception):
            logger.warning("Agent warmup dependency failed: %s", result)


async def _ping_content_api() -> None:
    import httpx

    base = (settings.content_base_url or "").rstrip("/")
    if not base:
        return
    url = f"{base}/actuator/health"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
        logger.info("Agent warmup: content API reachable status=%s", resp.status_code)
    except Exception as exc:
        logger.warning("Agent warmup: content API ping failed: %s", exc)


def _connect_milvus() -> None:
    try:
        from app.rag.chapter_index import _milvus_backend

        _milvus_backend._connect()
        logger.info("Agent warmup: Milvus connection ready")
    except Exception as exc:
        logger.warning("Agent warmup: Milvus connect failed: %s", exc)


async def _ping_llm() -> None:
    """Optional one-token probe to warm provider TLS + prompt-cache prefix."""
    try:
        from langchain_core.messages import HumanMessage

        from app.core.llm import llm_provider

        llm = llm_provider.get_llm(profile="fast")
        await llm.ainvoke([HumanMessage(content="ping")])
        logger.info("Agent warmup: LLM probe ok")
    except Exception as exc:
        logger.warning("Agent warmup: LLM probe failed: %s", exc)
