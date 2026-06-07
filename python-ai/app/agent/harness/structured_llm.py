"""Structured outputs: Pydantic → forced tool / JSON schema with retry on validation errors."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, TypeVar

from langchain_core.messages import BaseMessage, HumanMessage

from app.agent.harness.tool_errors import (
    format_wrong_structured_tool_error,
    max_structured_output_retries,
    structured_tool_aliases_for,
)
from app.agent.context.prompting.retry import (
    format_retry_human_message,
    structured_retry_human_content,
)
from app.agent.context.prompting.types import RetryContext
from pydantic import BaseModel, ValidationError

from app.core.llm import llm_provider

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

_STRUCTURED_RETRY_BASE_SEC = 0.45


def format_schema_error(exc: Exception) -> str:
    """Human-readable validation error for LLM retry feedback."""
    if isinstance(exc, ValidationError):
        parts: list[str] = []
        for err in exc.errors()[:6]:
            loc = ".".join(str(x) for x in err.get("loc", ()))
            msg = err.get("msg", "invalid")
            parts.append(f"{loc or 'root'}: {msg}")
        return "; ".join(parts) or str(exc)
    return str(exc)


def _coerce_parsed(parsed: Any, model: type[T]) -> T:
    if isinstance(parsed, model):
        return parsed
    if isinstance(parsed, dict):
        return model.model_validate(parsed)
    raise ValueError(f"structured output type mismatch: {type(parsed).__name__}")


def _iter_native_tool_calls(raw: Any) -> list[tuple[str, dict[str, Any]]]:
    """All tool invocations on a raw AIMessage (tool_calls + tool_use blocks)."""
    out: list[tuple[str, dict[str, Any]]] = []
    if raw is None:
        return out
    tool_calls = getattr(raw, "tool_calls", None) or []
    for call in tool_calls:
        if isinstance(call, dict):
            name = str(call.get("name") or call.get("tool") or "").strip()
            args = call.get("args") or call.get("input") or {}
        else:
            name = str(getattr(call, "name", "") or "").strip()
            args = getattr(call, "args", None) or {}
        if not name:
            continue
        if not isinstance(args, dict):
            args = {}
        out.append((name, dict(args)))
    content = getattr(raw, "content", None)
    if isinstance(content, list):
        for block in content:
            if not isinstance(block, dict) or block.get("type") != "tool_use":
                continue
            name = str(block.get("name") or "").strip()
            inp = block.get("input")
            if name and isinstance(inp, dict):
                out.append((name, dict(inp)))
    return out


def _extract_structured_args_from_raw(
    raw: Any,
    *,
    schema_name: str,
) -> dict[str, Any] | None:
    """Pull forced-schema tool args only (ignore mistaken direct agent tool calls)."""
    aliases = structured_tool_aliases_for(schema_name)
    for name, args in _iter_native_tool_calls(raw):
        if name.lower() in aliases and args:
            return args
    return None


def _structured_parse_error(out: dict[str, Any], model: type[T]) -> ValueError:
    """CC-style: wrong native tool → tool_use_error; else LangChain parse error."""
    raw = out.get("raw")
    schema_name = model.__name__
    aliases = structured_tool_aliases_for(schema_name)
    if raw is not None:
        for name, _args in _iter_native_tool_calls(raw):
            if name.lower() not in aliases:
                return ValueError(
                    format_wrong_structured_tool_error(name, schema_name)
                )
    err = out.get("parsing_error")
    if err is not None:
        detail = format_schema_error(err) if isinstance(err, Exception) else str(err)
        return ValueError(
            f"structured parse failed for {schema_name}: {detail}"
        )
    return ValueError(f"structured output missing for {schema_name}")


def _salvage_structured_from_raw(out: dict[str, Any], model: type[T]) -> T | None:
    """Re-validate PlanResult wrapper args when LangChain parse fails but tool was correct."""
    raw = out.get("raw")
    if raw is None:
        return None

    args = _extract_structured_args_from_raw(raw, schema_name=model.__name__)
    if not args:
        return None
    try:
        return model.model_validate(args)
    except ValidationError:
        return None


async def invoke_structured(
    messages: list[BaseMessage],
    model: type[T],
    *,
    profile: str | None = None,
) -> T:
    """Single LLM call with forced tool matching `model` schema."""
    llm = llm_provider.get_llm(profile=profile or "default")
    chain = llm.with_structured_output(
        model,
        include_raw=True,
        method="function_calling",
    )
    out = await chain.ainvoke(messages)
    if isinstance(out, dict):
        parsed = out.get("parsed")
        if parsed is not None:
            return _coerce_parsed(parsed, model)
        salvaged = _salvage_structured_from_raw(out, model)
        if salvaged is not None:
            logger.info(
                "structured %s recovered from raw tool args after LangChain parse miss",
                model.__name__,
            )
            return salvaged
        raise _structured_parse_error(out, model)
    return _coerce_parsed(out, model)


async def invoke_structured_with_retry(
    messages: list[BaseMessage],
    model: type[T],
    *,
    profile: str | None = None,
    max_attempts: int | None = None,
    retry_feedback_prefix: str | None = None,
    use_retry_json: bool = False,
) -> T:
    """CC-style forced tool: on schema/parse failure, feed error back and retry."""
    attempts = max_attempts if max_attempts is not None else max_structured_output_retries()
    prefix = retry_feedback_prefix or f"{model.__name__} schema validation failed"
    base_messages = list(messages)
    last_exc: Exception | None = None

    for attempt in range(1, attempts + 1):
        attempt_messages = list(base_messages)
        if last_exc is not None:
            detail = format_schema_error(last_exc)
            if use_retry_json:
                attempt_messages.append(
                    format_retry_human_message(
                        RetryContext(
                            attempt=attempt - 1,
                            max_attempts=attempts,
                            error_code="schema_validation",
                            error_detail=detail,
                            target_schema=model.__name__,
                            last_payload_hint=prefix,
                        )
                    )
                )
            else:
                attempt_messages.append(
                    HumanMessage(
                        content=structured_retry_human_content(
                            prefix=prefix,
                            attempt=attempt - 1,
                            max_attempts=attempts,
                            detail=detail,
                            schema_name=model.__name__,
                        )
                    )
                )
        try:
            return await invoke_structured(attempt_messages, model, profile=profile)
        except Exception as exc:
            last_exc = exc
            logger.warning(
                "structured %s attempt %s/%s failed profile=%s: %s",
                model.__name__,
                attempt,
                attempts,
                profile,
                exc,
            )
            if attempt < attempts:
                await asyncio.sleep(_STRUCTURED_RETRY_BASE_SEC * attempt)

    assert last_exc is not None
    raise last_exc


async def try_invoke_structured(
    messages: list[BaseMessage],
    model: type[T],
    *,
    profile: str | None = None,
) -> T | None:
    try:
        return await invoke_structured_with_retry(messages, model, profile=profile)
    except Exception as exc:
        logger.info(
            "structured %s skipped profile=%s: %s",
            model.__name__,
            profile,
            exc,
        )
        return None
