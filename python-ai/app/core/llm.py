"""LLM integration — MiniMax via Anthropic protocol (default) or OpenAI-compatible fallback."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator, Callable
from typing import Literal

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import settings
from app.core.llm_content import extract_llm_text

logger = logging.getLogger(__name__)

LLMProfile = Literal["default", "plan", "fast", "crawl"]

try:
    from langchain_anthropic import ChatAnthropic
except ImportError:  # pragma: no cover
    ChatAnthropic = None  # type: ignore[misc, assignment]

try:
    from langchain_openai import ChatOpenAI
except ImportError:  # pragma: no cover
    ChatOpenAI = None  # type: ignore[misc, assignment]


class LLMError(Exception):
    """Base exception for LLM-related errors."""


class LLMProvider:
    """Unified LLM provider with MiniMax Anthropic protocol as default."""

    def __init__(self) -> None:
        self._llm_default: BaseChatModel | None = None
        self._llm_plan: BaseChatModel | None = None
        self._llm_crawl: BaseChatModel | None = None
        self._provider = settings.active_provider

    def _resolve_config(self, config: dict | None, *, profile: LLMProfile) -> dict:
        if profile == "crawl" and config is None:
            base = dict(settings.get_crawl_llm_config())
        else:
            base = dict(settings.get_active_llm_config())
        if config:
            base.update(config)
        if profile == "plan":
            base["max_tokens"] = int(
                base.get("plan_max_tokens") or base.get("max_tokens") or 8192
            )
            base["timeout"] = int(base.get("plan_timeout") or base.get("timeout") or 120)
        elif profile == "fast":
            base["max_tokens"] = min(int(base.get("max_tokens") or 8192), 2048)
            base["timeout"] = min(int(base.get("timeout") or 90), 45)
        return base

    def _create_llm(self, config: dict) -> BaseChatModel:
        api_key = config.get("api_key")
        if not api_key:
            raise LLMError(f"API key not configured for provider: {self._provider}")

        protocol = str(config.get("protocol") or "anthropic").lower()
        model = config.get("model") or "MiniMax-M3"
        max_tokens = int(config.get("max_tokens") or 8192)
        timeout = float(config.get("timeout") or 90)
        temperature = float(config.get("temperature") if config.get("temperature") is not None else 1.0)
        base_url = config.get("base_url")

        if protocol == "anthropic":
            if ChatAnthropic is None:
                raise LLMError("langchain-anthropic is not installed")
            kwargs: dict = {
                "model": model,
                "api_key": api_key,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "timeout": timeout,
            }
            if base_url:
                kwargs["base_url"] = base_url.rstrip("/")
            logger.info(
                "LLM anthropic protocol model=%s base_url=%s max_tokens=%s timeout=%s",
                model,
                base_url or "default",
                max_tokens,
                timeout,
            )
            return ChatAnthropic(**kwargs)

        if ChatOpenAI is None:
            raise LLMError("langchain-openai is not installed")
        extra_body = config.get("extra_body") or {"reasoning_split": True}
        logger.info(
            "LLM openai protocol model=%s base_url=%s max_tokens=%s timeout=%s",
            model,
            base_url or "default",
            max_tokens,
            timeout,
        )
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=base_url,
            max_tokens=max_tokens,
            timeout=timeout,
            temperature=temperature,
            model_kwargs={"extra_body": extra_body},
        )

    def get_llm(
        self,
        config: dict | None = None,
        *,
        profile: LLMProfile = "default",
    ) -> BaseChatModel:
        resolved = self._resolve_config(config, profile=profile)
        if config is not None:
            return self._create_llm(resolved)

        if profile == "plan":
            if self._llm_plan is None:
                self._llm_plan = self._create_llm(resolved)
            return self._llm_plan

        if profile == "crawl":
            if self._llm_crawl is None:
                self._llm_crawl = self._create_llm(resolved)
            return self._llm_crawl

        if profile == "fast":
            # Separate instance: lower token budget for quick JSON tools.
            return self._create_llm(resolved)

        if self._llm_default is None:
            self._llm_default = self._create_llm(resolved)
        return self._llm_default

    def switch_provider(self, provider: str) -> None:
        self._provider = provider
        self._llm_default = None
        self._llm_plan = None
        self._llm_crawl = None

    @property
    def is_configured(self) -> bool:
        return settings.is_llm_configured

    @property
    def is_crawl_configured(self) -> bool:
        return settings.is_crawl_llm_configured

    @property
    def provider_name(self) -> str:
        return self._provider

    @property
    def current_model(self) -> str:
        return settings.get_active_llm_config().get("model", "unknown")

    @property
    def protocol(self) -> str:
        return str(settings.get_active_llm_config().get("protocol") or "anthropic")


llm_provider = LLMProvider()


def message_text(raw: object) -> str:
    """Public helper for strategies — visible text only (skip thinking blocks)."""
    return extract_llm_text(raw, include_thinking=False)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=5, min=5, max=60),
    retry=retry_if_exception_type((TimeoutError, ConnectionError)),
    reraise=True,
)
async def call_llm_with_retry(
    prompt: str,
    system_message: str | None = None,
    callback: Callable | None = None,
) -> str:
    from langchain_core.outputs import ChatResult

    llm = llm_provider.get_llm()
    messages = []
    if system_message:
        messages.append(SystemMessage(content=system_message))
    messages.append(HumanMessage(content=prompt))

    try:
        if callback:
            response = ""
            async for chunk in llm.astream(messages):
                piece = message_text(getattr(chunk, "content", chunk))
                if piece:
                    response += piece
                    callback(piece)
            return response
        result: ChatResult = await llm.ainvoke(messages)
        return message_text(getattr(result, "content", result))
    except Exception as exc:
        raise LLMError(f"LLM call failed: {exc}") from exc


async def generate_text(
    prompt: str,
    system_message: str | None = None,
    temperature: float = 1.0,
    *,
    profile: LLMProfile = "default",
) -> str:
    llm = llm_provider.get_llm(profile=profile)
    original_temperature = getattr(llm, "temperature", None)
    if hasattr(llm, "temperature"):
        llm.temperature = temperature
    try:
        return await call_llm_with_retry(prompt, system_message)
    finally:
        if original_temperature is not None and hasattr(llm, "temperature"):
            llm.temperature = original_temperature


async def generate_text_stream(
    prompt: str,
    system_message: str | None = None,
    temperature: float = 1.0,
) -> AsyncIterator[str]:
    llm = llm_provider.get_llm()
    original_temperature = getattr(llm, "temperature", None)
    if hasattr(llm, "temperature"):
        llm.temperature = temperature

    messages = []
    if system_message:
        messages.append(SystemMessage(content=system_message))
    messages.append(HumanMessage(content=prompt))

    try:
        async for chunk in llm.astream(messages):
            piece = message_text(getattr(chunk, "content", chunk))
            if piece:
                yield piece
    finally:
        if original_temperature is not None and hasattr(llm, "temperature"):
            llm.temperature = original_temperature
