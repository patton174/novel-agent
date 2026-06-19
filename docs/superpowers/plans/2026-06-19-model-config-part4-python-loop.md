# Part 4 — python-ai 透传 + reporter + 配置源切换

> 主索引：[2026-06-19-model-config.md](./2026-06-19-model-config.md) ｜ [Part 3](./2026-06-19-model-config-part3-python-registry.md)
> 设计：[册3 §5](../specs/2026-06-19-model-config-design-part3.md)
> 约定：python 测试 `cd python-ai && python -m pytest tests/test_reporter_cost.py -q`。先写失败测试。

---

## Task 18: AgentRunContext 加字段

**Files:**
- Modify: `python-ai/app/agent/schemas.py`

> 4 层镜像：Java `AgentRunContextDto.model_config`(snake_case) → python `AgentRunContext.model_config`。pydantic 默认忽略未知字段，但消费需显式声明。

- [ ] **Step 1: AgentRunContext 加字段**

在 `AgentRunContext`（`schemas.py:75-96`）的 `selected_choice` 字段后加：
```python
    model_config: dict[str, Any] | None = None
```
（pydantic v2；`Any` 已 import。`merged_patch` 不动。）

- [ ] **Step 2: 验证 import 不破坏**

```bash
cd python-ai && python -c "from app.agent.schemas import AgentRunContext; print(AgentRunContext(run_id='r',session_id='s',message_id='m',user_id=1).model_config)"
```
Expected: `None`。

- [ ] **Step 3: 提交**

```bash
git add python-ai/app/agent/schemas.py
git commit -m "feat(model): AgentRunContext 加 model_config 字段"
```

---

## Task 19: loop.py get_llm(config=) 透传

**Files:**
- Modify: `python-ai/app/agent/loop.py`

> `loop.py:346` `llm = llm_provider.get_llm(profile="default").bind_tools(...)`。改为优先用 `ctx.model_config`。`get_llm(config=...)` 已支持（llm.py:121，每次新建实例不污染单例）。

- [ ] **Step 1: 改 loop.py LLM 构造**

`loop.py:346` 改为：
```python
    llm = (
        llm_provider.get_llm(profile="default", config=base_ctx.model_config).bind_tools(build_agent_langchain_tools(state.ctx))
        if base_ctx.model_config
        else llm_provider.get_llm(profile="default").bind_tools(build_agent_langchain_tools(state.ctx))
    )
```
（`base_ctx` 即 `state.ctx`，`run_query_loop` 内 `base_ctx = _enrich_context(req.context)`，`ctx.model_config` 来自透传。）

- [ ] **Step 2: 其他 get_llm 调用点核对**

grep `get_llm(` 全 python-ai，确认 plan/fast profile 调用点（如 compact_autocompact.py:221 `profile="fast"`）也透传 ctx.model_config。对 fast：
```python
    llm = llm_provider.get_llm(profile="fast", config=ctx.model_config) if ctx.model_config else llm_provider.get_llm(profile="fast")
```
（plan profile 同理。各调用点逐一改。）

- [ ] **Step 3: 启动验证（无 model_config 时退回全局，行为不变）**

`_restart-dev-stack.ps1`，发一条消息确认 agent 正常（旧路径 model_config=None → get_llm(profile="default")）。

- [ ] **Step 4: 提交**

```bash
git add python-ai/app/agent/loop.py
git commit -m "feat(model): loop get_llm 透传 ctx.model_config"
```

---

## Task 20: reporter._compute_cost + byok 跳过

**Files:**
- Modify: `python-ai/app/billing/reporter.py`
- Test: `python-ai/tests/test_reporter_cost.py`

> `_model_cost_micros` 硬编码 → `_compute_cost(input,output,pricing)` 读 context.pricing。`report_llm_usage` 取 ctx.pricing/byok/model_code；BYOK 跳过上报。

- [ ] **Step 1: 写失败测试**

```python
"""reporter _compute_cost + byok 跳过。"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

from app.billing import reporter


def test_compute_cost_from_pricing():
    pricing = {"input_per_1k_micros": 2500, "output_per_1k_micros": 10000, "multiplier": 1.5}
    # 1000 input + 500 output = 2500 + 5000 = 7500; *1.5 = 11250
    assert reporter._compute_cost(1000, 500, pricing) == 11250


def test_compute_cost_none_pricing_returns_none():
    assert reporter._compute_cost(100, 50, None) is None


def test_compute_cost_partial_pricing():
    pricing = {"input_per_1k_micros": 1000, "output_per_1k_micros": None, "multiplier": 1.0}
    # 1000 input = 1000; output None=0
    assert reporter._compute_cost(1000, 500, pricing) == 1000


async def test_report_llm_usage_byok_skips_post():
    # BYOK 不上报
    with patch.object(reporter.httpx, "AsyncClient") as m:
        await reporter.report_llm_usage(
            user_id=10, run_id="r", session_id="s", model="x",
            usage={"input_tokens": 100, "output_tokens": 50}, step_index=0,
            pricing=None, byok=True, model_code="byok:1",
        )
        m.assert_not_called()
```
（`reporter.httpx` 暴露 httpx 供 patch——确认 reporter.py 顶部 `import httpx`。）

- [ ] **Step 2: 跑测试验证失败**

```bash
cd python-ai && python -m pytest tests/test_reporter_cost.py -q
```

- [ ] **Step 3: 改 reporter.py**

替换 `_model_cost_micros`（reporter.py:16-30）为：
```python
def _compute_cost(input_tokens: int, output_tokens: int, pricing: dict | None) -> int | None:
    """按模型定价计算成本（micros）。pricing=None 不计费。"""
    if pricing is None:
        return None
    inp = int(pricing.get("input_per_1k_micros") or 0)
    out = int(pricing.get("output_per_1k_micros") or 0)
    mult = float(pricing.get("multiplier") or 1.0)
    cost = (input_tokens * inp + output_tokens * out) / 1000 * mult
    return int(cost)
```
`report_llm_usage`（reporter.py:33-79）签名加 `pricing=None, byok=False, model_code=None`，逻辑改：
```python
async def report_llm_usage(
    *, user_id: int, run_id: str, session_id: str, model: str | None,
    usage: dict[str, int], step_index: int,
    pricing: dict | None = None, byok: bool = False, model_code: str | None = None,
) -> None:
    if not settings.billing_report_enabled or user_id <= 0:
        return
    if byok:
        # BYOK 不计费不上报，仅本地 trace 已在别处记
        return
    input_tokens = int(usage.get("input_tokens") or 0)
    output_tokens = int(usage.get("output_tokens") or 0)
    cache_read = int(usage.get("cache_read_input_tokens") or 0)
    cache_write = int(usage.get("cache_creation_input_tokens") or 0)
    cost = _compute_cost(input_tokens, output_tokens, pricing)
    unit_cost = None
    if pricing is not None:
        unit_cost = int(pricing.get("input_per_1k_micros") or 0) + int(pricing.get("output_per_1k_micros") or 0)

    trace_id = trace_id_var.get() or None
    idempotency = f"{run_id}:{step_index or 0}:{input_tokens}:{output_tokens}"
    payload: dict[str, Any] = {
        "userId": user_id, "runId": run_id, "sessionId": session_id, "traceId": trace_id,
        "eventType": "llm_call", "model": model,
        "inputTokens": input_tokens, "outputTokens": output_tokens,
        "cacheReadTokens": cache_read, "cacheWriteTokens": cache_write,
        "totalCostMicros": cost if cost is not None else 0,
        "unitCostMicros": unit_cost,
        "byok": False, "modelCode": model_code,
        "idempotencyKey": idempotency,
        "metadata": {"phase": "main_loop", "stepIndex": step_index},
    }
    url = settings.billing_report_url.rstrip("/") + "/internal/billing/usage/report"
    headers = {"X-Internal-Service-Key": settings.internal_service_key}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
    except Exception as ex:
        logger.warning("billing usage report failed: %s", ex)
```

- [ ] **Step 4: 调用点透传 pricing/byok/model_code**

`main_loop_llm.py:560-569` 调 `report_llm_usage` 处加 ctx 的 pricing/byok/model_code：
```python
    await report_llm_usage(
        user_id=ctx.user_id, run_id=ctx.run_id, session_id=ctx.session_id,
        model=model_name, usage=usage_fields, step_index=stream_state.sequence,
        pricing=ctx.model_config.get("pricing") if ctx.model_config else None,
        byok=ctx.model_config.get("byok", False) if ctx.model_config else False,
        model_code=ctx.model_config.get("code") if ctx.model_config else None,
    )
```

- [ ] **Step 5: 跑测试验证通过**

```bash
cd python-ai && python -m pytest tests/test_reporter_cost.py -q
```
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add python-ai/app/billing/reporter.py python-ai/app/agent/harness/main_loop_llm.py python-ai/tests/test_reporter_cost.py
git commit -m "feat(model): reporter _compute_cost 读 pricing；BYOK 跳过上报"
```

---

## Task 21: crawl 配置源 → ModelRegistry

**Files:**
- Modify: `python-ai/app/crawl/agent/loop.py`（`crawl_cfg = settings.get_crawl_llm_config()` @ line 55）
- Modify: `python-ai/app/core/llm.py`（`_resolve_config` profile=="crawl" @ line 45-46）

> crawl LLM 配置从 settings → ModelRegistry.get("crawl")。失败降级平台默认已由 registry 处理。

- [ ] **Step 1: 改 crawl/agent/loop.py**

`crawl/agent/loop.py:55` `crawl_cfg = settings.get_crawl_llm_config()` 改为：
```python
    from app.core.model_registry import model_registry
    try:
        crawl_cfg = model_registry.get("crawl")
    except RuntimeError:
        crawl_cfg = settings.get_crawl_llm_config()  # 兜底（registry 无默认时）
```
（`crawl_cfg` 字段需对齐——registry 返回的 dict 键为 `api_key/base_url/model/max_tokens/timeout/temperature/protocol`，与 `get_crawl_llm_config` 输出对齐：registry 返回 `model_name` 而非 `model`，需适配。**适配**：在 ModelRegistry.get 返回的 config 上补 `model` 键 = `model_name`，或调用方读 `model_name`。统一：调用方用 `crawl_cfg["model_name"]`。核对 `crawl/agent/loop.py` 对 crawl_cfg 的字段访问，按 `model_name` 改。）

- [ ] **Step 2: 改 llm.py _resolve_config crawl 分支**

`llm.py:45-46` profile=="crawl" 从 `settings.get_crawl_llm_config()` → 优先 ModelRegistry：
```python
        if profile == "crawl":
            from app.core.model_registry import model_registry
            try:
                return model_registry.get("crawl")
            except RuntimeError:
                return settings.get_crawl_llm_config()
```
（registry 返回 dict 已含 protocol/api_key/base_url/model_name 等；`_create_llm` 读 `model` 键——需 registry 返回里 `model` = `model_name`。**统一约定**：registry 返回的 config dict 同时含 `model` 和 `model_name`（Java toActiveConfig 加 `model` 键 = modelName）。回 Part3 Task16 toActiveConfig 补 `c.put("model", e.getModelName())`。）

- [ ] **Step 3: Java toActiveConfig 补 model 键**

`AiModelService.toActiveConfig`（Part3 Task16）加：
```java
        c.put("model", e.getModelName());
```
（与 `model_name` 并存，python `_create_llm` 读 `model`。）

- [ ] **Step 4: 启动验证 crawl 不破**

`_restart-dev-stack.ps1`，确认爬虫路径无报错（crawl orchestrator 默认关，仅确认 import 正常）。

- [ ] **Step 5: 提交**

```bash
git add python-ai/app/crawl/agent/loop.py python-ai/app/core/llm.py \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/AiModelService.java
git commit -m "feat(model): crawl 配置源→ModelRegistry(降级默认)"
```

---

## Task 22: rag embed 配置源 → ModelRegistry

**Files:**
- Modify: `python-ai/app/rag/embeddings.py`

> `_resolve_embed_api_key`/`_resolve_embed_base_url`/provider/model 读 settings → ModelRegistry.get("embedding")。

- [ ] **Step 1: 改 embeddings.py**

在 `embed_texts`（`embeddings.py:72`）入口取 registry config：
```python
    from app.core.model_registry import model_registry
    try:
        embed_cfg = model_registry.get("embedding")
    except RuntimeError:
        embed_cfg = None  # 降级旧 settings 逻辑
    provider = (embed_cfg or {}).get("provider") or settings.rag_embed_provider
    api_key = (embed_cfg or {}).get("api_key") or _resolve_embed_api_key()
    base_url = (embed_cfg or {}).get("base_url") or _resolve_embed_base_url()
    model = (embed_cfg or {}).get("model_name") or settings.rag_embed_model
```
（原 `embed_texts` 内 `provider = settings.rag_embed_provider` 等行替换为上述。`_resolve_embed_api_key`/`_resolve_embed_base_url` 保留作降级。）

- [ ] **Step 2: 启动验证 RAG 索引**

`_restart-dev-stack.ps1`，触发一次章节索引（保存章节），确认 embedding 调用正常（用 registry 配置或降级 settings）。

- [ ] **Step 3: 提交**

```bash
git add python-ai/app/rag/embeddings.py
git commit -m "feat(model): rag embed 配置源→ModelRegistry(降级 settings)"
```

---

## Task 23: image 配置源 → ModelRegistry

**Files:**
- Modify: `python-ai/app/services/agnes_image.py`

> `is_configured`/`_endpoint`/`text_to_image` 读 settings → ModelRegistry.get("image")。

- [ ] **Step 1: 改 agnes_image.py**

在 `is_configured`（`agnes_image.py:20`）+ `_post_generate`（`:77/82`）取 registry config：
```python
    from app.core.model_registry import model_registry
    try:
        img_cfg = model_registry.get("image")
    except RuntimeError:
        img_cfg = None
    api_key = (img_cfg or {}).get("api_key") or settings.agnes_image_api_key
    base_url = (img_cfg or {}).get("base_url") or settings.agnes_image_base_url
    model = (img_cfg or {}).get("model_name") or settings.agnes_image_model
```
（原 `settings.agnes_image_*` 读取替换为上述；`is_configured` 用 `bool(api_key)`。）

- [ ] **Step 2: 启动验证**

`_restart-dev-stack.ps1`，确认 image 路由 import 正常（实际生成需 admin 触发）。

- [ ] **Step 3: 提交**

```bash
git add python-ai/app/services/agnes_image.py
git commit -m "feat(model): image 配置源→ModelRegistry(降级 settings)"
```

---

Part 4 完成。→ 继续 [Part 5 — 前端](./2026-06-19-model-config-part5-frontend.md)
