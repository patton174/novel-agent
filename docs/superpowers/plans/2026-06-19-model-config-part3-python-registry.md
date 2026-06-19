# Part 3 — python-ai ModelRegistry + 路由

> 主索引：[2026-06-19-model-config.md](./2026-06-19-model-config.md) ｜ [Part 2](./2026-06-19-model-config-part2-java-quota.md)
> 设计：[册3 §5](../specs/2026-06-19-model-config-design-part3.md)
> 约定：python 测试 `cd python-ai && python -m pytest tests/test_model_registry.py -q`。先写失败测试。

---

## Task 15: model_registry.py（缓存+降级+报警去重）

**Files:**
- Create: `python-ai/app/core/model_registry.py`
- Test: `python-ai/tests/test_model_registry.py`

> ModelRegistry 进程内缓存（TTL 60s），embedding/crawl/image 配置源。拉取失败→平台默认(`/internal/model/active?default=true`)+报警；默认也空→error 报警+抛异常。报警去重 60s。

- [ ] **Step 1: 写失败测试**

```python
"""ModelRegistry 单测。"""

from __future__ import annotations

import time
from unittest.mock import patch

from app.core.model_registry import ModelRegistry


def _mk_reg(monkeypatch):
    reg = ModelRegistry()
    reg._cache.clear()
    reg._fetched_at.clear()
    reg._alerted.clear()
    return reg


def test_get_returns_cached_within_ttl(monkeypatch):
    reg = _mk_reg(monkeypatch)
    cfg = {"provider": "openai", "model_name": "x"}
    reg._cache["embedding"] = cfg
    reg._fetched_at["embedding"] = time.monotonic()
    assert reg.get("embedding") is cfg


def test_get_fetches_active_when_expired(monkeypatch):
    reg = _mk_reg(monkeypatch)
    reg._cache["crawl"] = {"old": True}
    reg._fetched_at["crawl"] = time.monotonic() - 120  # 过期
    fetched = {"provider": "openai", "model_name": "new"}
    with patch.object(reg, "_fetch", return_value=fetched) as m:
        assert reg.get("crawl") == fetched
        m.assert_called_once_with("crawl", default=False)


def test_get_falls_back_to_platform_default_and_alerts(monkeypatch):
    reg = _mk_reg(monkeypatch)
    default_cfg = {"provider": "openai", "model_name": "def"}
    calls = []

    def fake_fetch(model_type, default):
        calls.append((model_type, default))
        return default_cfg if default else None  # 活跃拉失败，默认成功

    with patch.object(reg, "_fetch", side_effect=fake_fetch):
        with patch.object(reg, "_alert") as alert:
            assert reg.get("image") == default_cfg
            alert.assert_called_once()
            assert alert.call_args.kwargs["severity"] == "warn"


def test_get_raises_when_default_also_missing(monkeypatch):
    reg = _mk_reg(monkeypatch)
    with patch.object(reg, "_fetch", return_value=None):
        with patch.object(reg, "_alert") as alert:
            try:
                reg.get("embedding")
                assert False, "应抛异常"
            except RuntimeError:
                pass
            alert.assert_called_once()
            assert alert.call_args.kwargs["severity"] == "error"


def test_alert_dedup_within_60s(monkeypatch):
    reg = _mk_reg(monkeypatch)
    with patch.object(reg, "_fetch", return_value=None):
        with patch.object(reg, "_alert") as alert:
            for _ in range(5):
                try:
                    reg.get("embedding")
                except RuntimeError:
                    pass
            assert alert.call_count == 1  # 60s 内仅一次
```

- [ ] **Step 2: 跑测试验证失败**

```bash
cd python-ai && python -m pytest tests/test_model_registry.py -q
```
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 写 model_registry.py**

```python
"""活跃模型配置缓存（embedding/crawl/image）。失败→平台默认+报警。"""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

TTL_SEC = 60
ALERT_DEDUP_SEC = 60


class ModelRegistry:
    """进程内缓存。单 uvicorn worker 下全局一致。"""

    def __init__(self) -> None:
        self._cache: dict[str, dict[str, Any]] = {}
        self._fetched_at: dict[str, float] = {}
        self._alerted: dict[str, float] = {}

    def get(self, model_type: str) -> dict[str, Any]:
        now = time.monotonic()
        cached_at = self._fetched_at.get(model_type, 0)
        if model_type in self._cache and now - cached_at < TTL_SEC:
            return self._cache[model_type]

        # 1. 拉活跃
        cfg = self._fetch(model_type, default=False)
        if cfg is not None:
            self._cache[model_type] = cfg
            self._fetched_at[model_type] = now
            return cfg

        # 2. 降级平台默认 + 报警
        default_cfg = self._fetch(model_type, default=True)
        if default_cfg is not None:
            self._cache[model_type] = default_cfg
            self._fetched_at[model_type] = now
            self._alert(model_type, "active missing, fallback default",
                        severity="warn", fallback_code=default_cfg.get("code"))
            return default_cfg

        # 3. 默认也空 → error + 抛异常
        self._alert(model_type, "no active nor default model", severity="error", fallback_code=None)
        raise RuntimeError(f"无可用 {model_type} 模型（活跃与默认均缺失）")

    def _fetch(self, model_type: str, *, default: bool) -> dict[str, Any] | None:
        url = f"{settings.content_base_url.rstrip('/')}/internal/model/active"
        params = {"type": model_type}
        if default:
            params["default"] = "true"
        headers = {"X-Internal-Service-Key": settings.internal_service_key}
        try:
            resp = httpx.get(url, params=params, headers=headers, timeout=5.0)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, dict) and data else None
        except Exception as e:
            logger.warning("model fetch failed type=%s default=%s err=%s", model_type, default, e)
            return None

    def _alert(self, model_type: str, reason: str, *, severity: str, fallback_code: str | None) -> None:
        key = f"{model_type}:{reason}"
        now = time.monotonic()
        last = self._alerted.get(key, 0)
        if now - last < ALERT_DEDUP_SEC:
            return  # 去重
        self._alerted[key] = now
        try:
            url = f"{settings.content_base_url.rstrip('/')}/internal/alert/model"
            headers = {"X-Internal-Service-Key": settings.internal_service_key}
            httpx.post(url, json={
                "model_type": model_type, "reason": reason,
                "fallback_model_code": fallback_code, "severity": severity,
            }, headers=headers, timeout=3.0)
        except Exception as e:
            logger.warning("model alert post failed: %s", e)


# 单例
model_registry = ModelRegistry()
```
（`settings.content_base_url` 已存在，指向 novel-studio:8080。）

- [ ] **Step 4: 跑测试验证通过**

```bash
cd python-ai && python -m pytest tests/test_model_registry.py -q
```
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add python-ai/app/core/model_registry.py python-ai/tests/test_model_registry.py
git commit -m "feat(model): ModelRegistry 缓存+降级平台默认+报警去重"
```

---

## Task 16: model_routes.py（/internal/model/active+test+/internal/alert/model）

**Files:**
- Create: `python-ai/app/api/model_routes.py`

> Java 侧接收：`GET /internal/model/active?type=&default=`（返回活跃/默认配置含解密 key）；`POST /internal/model/test`（连通性）；`POST /internal/alert/model`（python→Java 报警，Java 落 model_alert）。**注意**：active/test 是 Java 端点（Python 调 Java），但 test 也可由 python 暴露供 Java 调——设计 §5 写的是 python 暴露 `/internal/model/test` 供 Java CRM 调。active 是 Java 端点。**澄清**：
- `/internal/model/active` + `/internal/alert/model` → **Java 端点**（python 调 Java 拉/报警）
- `/internal/model/test` → **python 端点**（Java CRM 调 python 测连通）

本任务只建 **python 侧 `/internal/model/test`** 端点。Java 侧 active/alert 端点属 Java Part（见下）。

- [ ] **Step 1: 写 model_routes.py（python 侧仅 test）**

```python
"""/internal/model/test — 连通性测试（Java CRM 调）。"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.core.llm import llm_provider

logger = logging.getLogger(__name__)

internal_router = APIRouter()


def _verify_internal_key(key: str | None) -> None:
    expected = settings.internal_service_key
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="invalid internal service key")


class ModelTestRequest(BaseModel):
    config: dict


@internal_router.post("/model/test")
async def test_model(
    body: ModelTestRequest,
    x_internal_service_key: str | None = Header(default=None, alias="X-Internal-Service-Key"),
):
    _verify_internal_key(x_internal_service_key)
    try:
        llm = llm_provider._create_llm(body.config)
        from langchain_core.messages import HumanMessage
        await llm.ainvoke([HumanMessage(content="ping")])
        return {"ok": True}
    except Exception as e:
        logger.warning("model test failed: %s", e)
        return {"ok": False, "error": str(e)}
```

- [ ] **Step 2: Java 侧 active + alert 端点**

Create `novel-studio/.../controller/internal/InternalModelController.java`：
```java
package cn.novelstudio.module.content.controller.internal;

import cn.novelstudio.kernel.result.Result;
import cn.novelstudio.module.content.entity.AiModelEntity;
import cn.novelstudio.module.content.repository.AiModelRepository;
import cn.novelstudio.module.content.service.AiModelService;
import cn.novelstudio.module.content.support.ModelKeyCodec;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/internal/model")
@RequiredArgsConstructor
public class InternalModelController {

    private final AiModelRepository aiModelRepo;
    private final AiModelService aiModelService;
    private final ModelKeyCodec keyCodec;

    @GetMapping("/active")
    public Result<Map<String, Object>> active(
        @RequestParam("type") String type,
        @RequestParam(value = "default", required = false) String def) {
        AiModelEntity e = "true".equals(def)
            ? aiModelRepo.findFirstByModelTypeAndIsDefaultTrueAndIsActiveTrue(type).orElse(null)
            : aiModelRepo.findFirstByModelTypeAndActiveTrueOrderBySortOrder(type).orElse(null);
        if (e == null) return Result.fail(404, "no model");
        return Result.ok(aiModelService.toActiveConfig(e)); // 见下
    }
}
```
（`AiModelRepository` 加 `findFirstByModelTypeAndActiveTrueOrderBySortOrder`；`Result.fail(404,...)` 按 kernel Result API——若用 `Result.error` 按实际。）

`AiModelService.toActiveConfig(e)`（返回含解密 key 的 Map，供 python 用——内部端点不回显前端，明文 key 合法）：
```java
    public Map<String, Object> toActiveConfig(AiModelEntity e) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("code", e.getCode()); c.put("model_type", e.getModelType());
        c.put("provider", e.getProvider()); c.put("protocol", e.getProtocol());
        c.put("model_name", e.getModelName()); c.put("base_url", e.getBaseUrl());
        c.put("api_key", keyCodec.decrypt(e.getApiKeyEnc()));
        c.put("max_tokens", e.getMaxTokens()); c.put("temperature", e.getTemperature());
        c.put("pricing", buildPricing(e));
        return c;
    }
```
（`buildPricing` 在 Task 7 已建。）

Java 报警接收端点 `InternalAlertController`：
```java
@RestController
@RequestMapping("/internal/alert")
public class InternalAlertController {
    @PostMapping("/model")
    public Result<Void> modelAlert(@RequestBody Map<String,Object> body) {
        // 落 model_alert 日志表（本计划暂用 log + audit；正式表留模块2）
        log.warn("model alert: {}", body);
        // 可选：写 audit_log
        return Result.ok();
    }
}
```
（`model_alert` 表留模块2；本模块仅日志 + 可选 audit_log。）

- [ ] **Step 3: 编译验证（Java）**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
```

- [ ] **Step 4: 提交**

```bash
git add python-ai/app/api/model_routes.py \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/controller/internal/InternalModelController.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/controller/internal/InternalAlertController.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/AiModelService.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/repository/AiModelRepository.java
git commit -m "feat(model): python /internal/model/test + Java /internal/model/active+/alert/model"
```

---

## Task 17: main.py 注册 + 预热

**Files:**
- Modify: `python-ai/app/main.py`

- [ ] **Step 1: 注册 model_routes + 预热 ModelRegistry**

在 `app/main.py` import 区加：
```python
from app.api.model_routes import internal_router as model_internal_router
```
在 `app.include_router(parse_internal_router, ...)`（若已有）或 `crawler_internal_router` 后加：
```python
app.include_router(model_internal_router, prefix="/internal", tags=["Model Internal"])
```
在 `startup_event`（`main.py:56`）加预热（best-effort）：
```python
    # 预热 ModelRegistry（best-effort，失败静默降级 env→默认）
    from app.core.model_registry import model_registry
    for t in ("embedding", "crawl", "image"):
        try:
            model_registry.get(t)
        except Exception as e:
            logger.warning("model registry warmup failed type=%s err=%s", t, e)
```

- [ ] **Step 2: 启动验证**

`_restart-dev-stack.ps1`，确认 python-ai 启动含 model 路由注册 + 预热日志。curl 测：
```bash
curl -s -H "X-Internal-Service-Key: dev-internal-key-change-me" \
  "http://127.0.0.1:8080/internal/model/active?type=llm&default=true"
```
Expected: 返回默认 LLM 配置（含 api_key 明文，内网）。

- [ ] **Step 3: 提交**

```bash
git add python-ai/app/main.py
git commit -m "feat(model): main.py 注册 model_routes + ModelRegistry 预热"
```

---

Part 3 完成。→ 继续 [Part 4 — python 透传+reporter+配置源](./2026-06-19-model-config-part4-python-loop.md)
