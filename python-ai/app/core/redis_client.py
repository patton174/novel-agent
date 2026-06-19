"""Redis 单例（解析进度等）。复用 CN 开发中间件 118.89.123.201:16379。"""

from __future__ import annotations

import logging

from redis import Redis

from app.config import settings

logger = logging.getLogger(__name__)

_redis: Redis | None = None


def get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(settings.redis_url, decode_responses=True)
        logger.info("redis connected url=%s", settings.redis_url)
    return _redis


def set_parse_progress(file_id: str, pct: int, ttl_sec: int = 3600) -> None:
    try:
        get_redis().set(f"parse:progress:{file_id}", str(pct), ex=ttl_sec)
    except Exception as e:  # 进度非关键，失败不阻断解析
        logger.warning("set parse progress failed fileId=%s err=%s", file_id, e)


def get_parse_progress(file_id: str) -> int | None:
    try:
        v = get_redis().get(f"parse:progress:{file_id}")
        return int(v) if v is not None else None
    except Exception:
        return None
