# Part 3 — python daemon Redis 单例实现计划

> 主索引：[2026-06-19-crawler.md](./2026-06-19-crawler.md) ｜ [Part 2](./2026-06-19-crawler-part2-java-orchestrator.md)
> 设计：[册2 §4](../specs/2026-06-19-crawler-design-part2.md)
> 约定：python 测试 `cd python-ai && python -m pytest tests/test_crawl_*.py -q`。先写失败测试。

---

## Task 13: redis_client.py（若模块5 未建）

**Files:**
- Create: `python-ai/app/core/redis_client.py`（若已存在跳过）
- Modify: `python-ai/app/config.py`（加 redis_url，若未加）
- Modify: `python-ai/requirements.txt`（加 redis，若未加）

> 模块5 计划建此文件。若模块5 已实现则跳过本任务，直接用。

- [ ] **Step 1: 确认是否已存在**

```bash
ls python-ai/app/core/redis_client.py 2>/dev/null && echo "EXISTS, skip" || echo "create"
```

- [ ] **Step 2: 若不存在，写 redis_client.py**

```python
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
        _redis = Redis.from_url(settings.redis_url, decode_responses=True)
        logger.info("redis connected url=%s", settings.redis_url)
    return _redis


def acquire_lock(key: str, ttl_sec: int) -> bool:
    """SETNX + TTL 单例锁。成功返回 token（非空），失败 None。"""
    import secrets
    token = secrets.token_hex(8)
    ok = get_redis().set(key, token, nx=True, ex=ttl_sec)
    return bool(ok), token


def renew_lock(key: str, token: str, ttl_sec: int) -> bool:
    """续约（仅持锁者）。用 Lua 防误释放他人锁。"""
    lua = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], ARGV[2]) else return 0 end"
    return bool(get_redis().eval(lua, 1, key, token, str(ttl_sec)))


def release_lock(key: str, token: str) -> None:
    lua = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end"
    get_redis().eval(lua, 1, key, token)
```
（`acquire_lock` 返回 `(ok, token)`。）

- [ ] **Step 3: config.py 加 redis_url（若未加）**

`Settings` 加 `redis_url: str = "redis://127.0.0.1:6379/0"`。
`requirements.txt` 加 `redis>=5.0.0`。

- [ ] **Step 4: 验证连接**

```bash
cd python-ai && pip install redis
REDIS_URL=redis://118.89.123.201:16379/0 python -c "from app.core.redis_client import get_redis; print(get_redis().ping())"
```
Expected: `True`。

- [ ] **Step 5: 提交**

```bash
git add python-ai/app/core/redis_client.py python-ai/app/config.py python-ai/requirements.txt
git commit -m "feat(crawl): redis_client.py 单例锁工具"
```

---

## Task 14: orchestrator daemon Redis 单例锁 + 续约

**Files:**
- Modify: `python-ai/app/crawl/orchestrator/loop.py`
- Test: `python-ai/tests/test_orchestrator_lock.py`

> daemon 启动先获 `crawl:orchestrator:lock`（TTL=poll×2），未获锁等待；持锁后跑 cycle + 周期续约；崩溃 TTL 过期转移。

- [ ] **Step 1: 写失败测试**

```python
"""orchestrator daemon 单例锁。"""

from __future__ import annotations

from unittest.mock import patch

from app.crawl.orchestrator import loop as orch_loop


def test_acquire_lock_loop_succeeds_when_free(monkeypatch):
    # mock acquire_lock 返回成功
    with patch("app.crawl.orchestrator.loop.acquire_lock", return_value=(True, "tok")) as m:
        ok, token = orch_loop._wait_for_lock(poll=1)
        assert ok is True
        assert token == "tok"
        m.assert_called_once()


def test_acquire_lock_retries_when_held(monkeypatch):
    calls = iter([(False, ""), (False, ""), (True, "tok")])
    with patch("app.crawl.orchestrator.loop.acquire_lock", side_effect=lambda *a, **k: next(calls)) as m:
        with patch("app.crawl.orchestrator.loop.asyncio.sleep", new=AsyncMock()):
            ok, token = orch_loop._wait_for_lock(poll=0)
            assert ok is True
            assert m.call_count == 3
```
（`AsyncMock` from unittest.mock——Python 3.8+。需 `import asyncio`。）

- [ ] **Step 2: 跑测试验证失败**

```bash
cd python-ai && python -m pytest tests/test_orchestrator_lock.py -q
```

- [ ] **Step 3: 改 loop.py daemon**

在 `loop.py` import 加：
```python
from app.core.redis_client import acquire_lock, renew_lock, release_lock
```
加 `_wait_for_lock` + 改 `orchestrator_daemon`：
```python
LOCK_KEY = "crawl:orchestrator:lock"


async def _wait_for_lock(poll: int) -> tuple[bool, str]:
    """循环尝试获锁，直到成功。返回 (ok, token)。"""
    while True:
        ok, token = acquire_lock(LOCK_KEY, ttl_sec=max(10, poll * 2))
        if ok:
            return True, token
        await asyncio.sleep(poll)


async def orchestrator_daemon() -> None:
    global _wake_event
    _wake_event = asyncio.Event()
    logger.info("Crawl orchestrator daemon started (poll=%ss)", settings.crawl_orchestrator_poll_sec)
    client = OrchestratorClient()
    poll = max(5, settings.crawl_orchestrator_poll_sec)
    ok, token = await _wait_for_lock(poll)
    if not ok:
        return
    logger.info("orchestrator acquired singleton lock")
    try:
        await client.record_decision("主编排 daemon 已启动")
        while True:
            try:
                await run_orchestrator_once(client)
            except Exception as exc:
                logger.warning("orchestrator cycle error: %s", exc)
            # 续约
            if not renew_lock(LOCK_KEY, token, max(10, poll * 2)):
                # 续约失败（锁被抢）→ 重新等锁
                logger.warning("orchestrator lock lost, re-acquiring")
                ok, token = await _wait_for_lock(poll)
            _wake_event.clear()
            try:
                await asyncio.wait_for(_wake_event.wait(), timeout=poll)
            except asyncio.TimeoutError:
                pass
    finally:
        release_lock(LOCK_KEY, token)
        _wake_event = None
        await client.close()
```
（`start_orchestrator_background` 不变——仍按 `crawl_orchestrator_enabled` 启 daemon。）

- [ ] **Step 4: 跑测试验证通过**

```bash
cd python-ai && python -m pytest tests/test_orchestrator_lock.py -q
```
Expected: PASS。

- [ ] **Step 5: 启动验证**

`_restart-dev-stack.ps1`（设 `CRAWL_ORCHESTRATOR_ENABLED=true`），python 日志应见 "orchestrator acquired singleton lock"。第二个 worker（若有）应等待。

- [ ] **Step 6: 提交**

```bash
git add python-ai/app/crawl/orchestrator/loop.py python-ai/tests/test_orchestrator_lock.py
git commit -m "feat(crawl): orchestrator daemon Redis 单例锁+续约+崩溃恢复"
```

---

## Task 15: goal 从 Java 拉（已支持，确认）

> 勘察确认：python `OrchestratorClient.get_state()`（client.py:27）已调 `GET /internal/crawl/orchestrator`，`_one_cycle`（loop.py:83）已 `state = await client.get_state()` 读 goal。Part2 T9 把 Java state 持久化 DB 后，python 自动读 DB 内容。**无需改 python**。

- [ ] **Step 1: 确认 get_state 仍工作**

`_restart-dev-stack.ps1`，设 goal（CrawlerPage PUT）→ python daemon 下次 cycle 拉到新 goal（DB）。查 python 日志 "主编排" 决策含新 goal。

- [ ] **Step 2: 若需调整 enabled 读取**

`_one_cycle` 现读 `state` 的 goal。若 DB state 含 `enabled` 字段且需 daemon 据此休眠，加判断：
```python
    state = await client.get_state()
    if not state.get("enabled", True):
        await client.mark_sleeping()
        return
    goal = state.get("goal") or ""
    if not goal.strip():
        await client.mark_sleeping()
        return
```
（确认 `get_state` 返回含 `enabled`——Part2 T9 toDto 含。）

- [ ] **Step 3: 提交（若有改动）**

```bash
git status -- python-ai/app/crawl/orchestrator/loop.py
git add python-ai/app/crawl/orchestrator/loop.py && git commit -m "feat(crawl): daemon 按 state.enabled 休眠" || echo "no change"
```

---

Part 3 完成。→ 继续 [Part 4 — 前端](./2026-06-19-crawler-part4-frontend.md)
