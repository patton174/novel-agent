"""
托管模式（host_mode）流式守护：心跳保活 + 失败自动重试。

开启后适合长时 Agent 任务，降低网络抖动或瞬时 LLM 错误导致的中断。
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Any, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")

# 默认：最多重试 3 次，心跳 15s，退避 2s 起
DEFAULT_MAX_RETRIES = 3
DEFAULT_HEARTBEAT_INTERVAL_SEC = 15.0
DEFAULT_RETRY_BASE_DELAY_SEC = 2.0


def resolve_host_mode(context: dict[str, Any] | None) -> bool:
    """从网关 context / preferences 解析是否启用托管模式。"""
    if not context:
        return False
    if context.get("host_mode") is True:
        return True
    preferences = context.get("preferences")
    if isinstance(preferences, dict) and preferences.get("host_mode") is True:
        return True
    return False


async def _iterate_with_heartbeat(
    stream: AsyncIterator[T],
    *,
    heartbeat_interval: float,
    heartbeat_factory: Callable[[], Awaitable[T] | T] | None,
) -> AsyncIterator[T]:
    """
    在长时间无事件时注入心跳，避免代理/客户端因空闲断开。
    使用 wait(FIRST_COMPLETED) 而非 wait_for，避免超时取消底层 async generator。
    """
    if heartbeat_factory is None or heartbeat_interval <= 0:
        async for item in stream:
            yield item
        return

    iterator = stream.__aiter__()
    pending: asyncio.Task[T] | None = None

    while True:
        if pending is None:
            pending = asyncio.create_task(iterator.__anext__())

        done, _ = await asyncio.wait({pending}, timeout=heartbeat_interval)

        if pending in done:
            try:
                yield pending.result()
            except StopAsyncIteration:
                break
            pending = None
            continue

        hb = heartbeat_factory()
        if asyncio.iscoroutine(hb):
            yield await hb
        else:
            yield hb


async def stream_with_host_guard(
    stream_factory: Callable[[], AsyncIterator[dict[str, Any]]],
    *,
    host_mode: bool,
    heartbeat_factory: Callable[[], Awaitable[dict[str, Any]] | dict[str, Any]] | None = None,
    recovery_factory: Callable[[int, str], Awaitable[dict[str, Any]] | dict[str, Any]] | None = None,
    max_retries: int = DEFAULT_MAX_RETRIES,
    heartbeat_interval: float = DEFAULT_HEARTBEAT_INTERVAL_SEC,
    retry_base_delay: float = DEFAULT_RETRY_BASE_DELAY_SEC,
) -> AsyncIterator[dict[str, Any]]:
    """
    包装 Agent 事件流。非托管模式直接透传；托管模式启用心跳与失败重试。

    stream_factory 在每次重试时会重新调用，以从头恢复 Agent 执行。
    """
    if not host_mode:
        async for event in stream_factory():
            yield event
        return

    attempt = 0
    while attempt <= max_retries:
        try:
            async for event in _iterate_with_heartbeat(
                stream_factory(),
                heartbeat_interval=heartbeat_interval,
                heartbeat_factory=heartbeat_factory,
            ):
                yield event
            return
        except Exception as exc:
            attempt += 1
            logger.warning(
                "host_mode stream failed (attempt %s/%s): %s",
                attempt,
                max_retries,
                exc,
            )
            if attempt > max_retries:
                raise
            if recovery_factory is not None:
                recovery = recovery_factory(attempt, str(exc))
                if asyncio.iscoroutine(recovery):
                    yield await recovery
                else:
                    yield recovery
            delay = retry_base_delay * (2 ** (attempt - 1))
            await asyncio.sleep(delay)


async def stream_text_with_keepalive(
    stream: AsyncIterator[str],
    *,
    enabled: bool,
    heartbeat_interval: float = DEFAULT_HEARTBEAT_INTERVAL_SEC,
    heartbeat_text: str = ": keepalive\n\n",
) -> AsyncIterator[str]:
    """Inject SSE comment keepalives on idle streams (host_mode PyAI→Python link)."""
    if not enabled or heartbeat_interval <= 0:
        async for chunk in stream:
            yield chunk
        return

    async def _heartbeat() -> str:
        return heartbeat_text

    async for item in _iterate_with_heartbeat(
        stream,
        heartbeat_interval=heartbeat_interval,
        heartbeat_factory=_heartbeat,
    ):
        yield item
