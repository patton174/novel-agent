"""Redis 单例（KG 进度 + 爬虫单例锁）。复用 CN 中间件。"""

from __future__ import annotations

import logging

from redis import Redis

from app.config import settings

logger = logging.getLogger(__name__)

_redis: Redis | None = None


def get_redis() -> Redis:
    global _redis
    if _redis is None:
        url = settings.redis_url_computed
        _redis = Redis.from_url(url, decode_responses=True)
        logger.info("redis connected url=%s", url)
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


def acquire_lock(key: str, ttl_sec: int) -> tuple[bool, str]:
    """SETNX + TTL 单例锁。成功返回 (True, token)，失败 (False, "")。"""
    import secrets

    token = secrets.token_hex(8)
    ok = get_redis().set(key, token, nx=True, ex=ttl_sec)
    return bool(ok), token if ok else ""


def renew_lock(key: str, token: str, ttl_sec: int) -> bool:
    """续约（仅持锁者）。用 Lua 防误释放他人锁。"""
    lua = (
        "if redis.call('get', KEYS[1]) == ARGV[1] then "
        "return redis.call('expire', KEYS[1], ARGV[2]) else return 0 end"
    )
    return bool(get_redis().eval(lua, 1, key, token, str(ttl_sec)))


def release_lock(key: str, token: str) -> None:
    lua = (
        "if redis.call('get', KEYS[1]) == ARGV[1] then "
        "return redis.call('del', KEYS[1]) else return 0 end"
    )
    get_redis().eval(lua, 1, key, token)
