# 模块 3：模型/APIkey 统一管理 — 实现计划（主索引）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> 本计划按层拆为 5 个分册（每文件 ~300 行）：
> 1. [part1-java-model](./2026-06-19-model-config-part1-java-model.md) — Java 模型目录（迁移/实体/加密/CRUD/套餐/默认）
> 2. [part2-java-quota](./2026-06-19-model-config-part2-java-quota.md) — Java 配额旁路 + context 透传 + 用户端点/BYOK + 计费字段
> 3. [part3-python-registry](./2026-06-19-model-config-part3-python-registry.md) — python-ai ModelRegistry + 路由 + 报警
> 4. [part4-python-loop](./2026-06-19-model-config-part4-python-loop.md) — python-ai 透传 + reporter 改造 + 三类配置源切换
> 5. [part5-frontend](./2026-06-19-model-config-part5-frontend.md) — 前端（admin 模型页 + ModelSelector + 设置/聊天切换 + i18n）
>
> 设计文档：[册1](../specs/2026-06-19-model-config-design.md) / [册2](../specs/2026-06-19-model-config-design-part2.md) / [册3](../specs/2026-06-19-model-config-design-part3.md)

**Goal:** 管理员配置全局模型目录（全部类型，含价格/倍率/key），用户按套餐选公共模型或加私有 BYOK 模型（不计费），python-ai 逐 run 透传 LLM 配置、动态拉取 embedding/crawl/image 配置，降级到单一平台默认模型并报警。

**Architecture:** Java(novel-studio) 持模型目录(`ai_model`)+套餐关联+用户模型(`user_model`，含 BYOK)，key 用 AesGcmCodec 加密。run 时 Java 解析用户模型(临时覆盖>默认>平台默认)→解密 key→塞进 AgentRunContextDto.model_config→透传 python。python agent loop 调 `get_llm(config=model_config)`；embedding/crawl/image 经 ModelRegistry(TTL 60s) 拉 `/internal/model/active`，失败降级平台默认+报警。reporter 读 context.pricing 替代硬编码；BYOK 跳过上报+配额。

**Tech Stack:** Java 21 / Spring Boot / JPA / Flyway / AesGcmCodec / RestClient；python-ai FastAPI / pydantic / httpx；前端 React+TS / Vite / secureFetch / lucide-react。

---

## 关键集成事实（来自 codebase 勘察）

1. **run context 是 4 层镜像**：Java `AgentRunContextDto`(record, snake_case via `@JsonNaming`) → python `AgentRunContext`(pydantic)。DTO 由 `AgentRunState.toContextDto()`（`AgentRunState.java:80-132`）构建，不是 assembler。`AgentContextAssembler.buildContext` 建的是 `Map`，`toContextDto` 从 Map 取字段构 record。加 `model_config` 字段需同步：record + assembler Map 写入 + `toContextDto` 映射 + python schema。
2. **配额旁路点**：`AgentBridgeService.java:133-135` `quotaGateService.assertCanStartRun(userId)`，调用点只有 userId——需先做模型解析再决定旁路。
3. **`UsageReportRequest`** 无 byok/model_code/unit_cost_micros 字段，需加；`UsageReportBiz.persistReport` 已信任 python 上报的 cost（不重算），需补 set unitCostMicros + byok + model_code。
4. **`AuthRoleSupport` 尚未落地**（模块 5 计划定义但未实现）。本计划 Task 1 创建它（模块 5 也依赖，先建此处）。
5. **AesGcmCodec** 有持久 key bean `sessionBlobCodec`（复用 JWT secret），但本模块需独立 bean + `MODEL_KEY_ENCRYPTION_KEY`。
6. **python get_llm(config=...)** 已支持透传（`llm.py:121`，每次新建实例不污染单例）——LLM 透传无需改 LLMProvider 类。
7. **`_model_cost_micros`** 硬编码（`reporter.py:16-30`）——reporter 改造替换为读 context.pricing。
8. **配置源**：crawl(`config.py:155` get_crawl_llm_config)/active LLM(`config.py:130`)/rag embed(`config.py:36`/`embeddings.py`)/image(`config.py:111`/`agnes_image.py`)——四处改 ModelRegistry。

## 文件结构总览

### Java（novel-studio）
| 文件 | 职责 | 动作 |
|------|------|------|
| `studio-module-content/.../db/migration/V16__ai_model.sql` | 建表+扩列 | Create |
| `.../entity/AiModelEntity.java` | 模型目录实体 | Create |
| `.../entity/UserModelEntity.java` | 用户模型(默认+BYOK) | Create |
| `.../entity/AiModelPlanAccessEntity.java`+Pk | 模型-套餐关联 | Create |
| `.../entity/AiModelPlanAccessRepository.java`+`AiModelRepository`+`UserModelRepository` | Repos | Create |
| `.../support/ModelKeyCodec.java` | AesGcmCodec 封装(加解密 key) | Create |
| `.../config/ModelProperties.java` + ModelKeyCodec @Bean | 配置+bean | Create |
| `.../service/AiModelService.java` | CRUD+套餐+默认+加密 | Create |
| `.../controller/crm/CrmModelController.java` | 管理员端点 | Create |
| `.../service/auth/biz/AuthModelBiz.java` | 可用列表+默认+BYOK+gating | Create |
| `.../controller/auth/AuthModelController.java` | 用户端点 | Create |
| `studio-platform-web/.../AuthRoleSupport.java` | admin 角色门 | Create |
| `studio-module-agent/.../service/AgentContextAssembler.java` | 写 model_config 入 Map | Modify |
| `studio-module-agent/.../orchestration/AgentRunState.java` | toContextDto 映射 model_config | Modify |
| `studio-module-agent/.../dto/agent/AgentRunContextDto.java` | 加 model_config 字段 | Modify |
| `studio-module-agent/.../service/AgentBridgeService.java` | byok 旁路配额 | Modify |
| `studio-module-agent/.../service/AgentModelResolver.java` | 解析用户模型 | Create |
| `studio-module-billing/.../dto/UsageReportRequest.java` | 加 byok/model_code/unit_cost | Modify |
| `studio-module-billing/.../entity/UsageEventEntity.java` | 加 byok/model_code | Modify |
| `studio-module-billing/.../service/biz/UsageReportBiz.java` | 持久化 byok/model_code/unit_cost | Modify |
| `studio-module-content/.../ModelBootstrap.java` | ApplicationRunner env→DB 引导 | Create |
| `studio-app/.../resources/application.yml` | model.key-encryption-key | Modify |

### python-ai
| 文件 | 职责 | 动作 |
|------|------|------|
| `app/core/model_registry.py` | 活跃模型缓存+降级+报警去重 | Create |
| `app/api/model_routes.py` | /internal/model/active+test+/internal/alert/model | Create |
| `app/agent/schemas.py` | AgentRunContext 加 model_config/pricing/byok/model_code | Modify |
| `app/agent/loop.py` | get_llm(config=ctx.model_config) | Modify |
| `app/billing/reporter.py` | _compute_cost 读 pricing；byok 跳过 | Modify |
| `app/core/llm.py` | _resolve_config 透传(已支持，仅注释) | Modify |
| `app/crawl/runner.py`/`app/crawl/agent/loop.py` | crawl 配置源→ModelRegistry | Modify |
| `app/rag/embeddings.py` | embed 配置源→ModelRegistry | Modify |
| `app/services/agnes_image.py` | image 配置源→ModelRegistry | Modify |
| `app/main.py` | 注册 model_routes + 预热 | Modify |
| `tests/test_model_registry.py`/`test_reporter_cost.py` | 单测 | Create |

### 前端
| 文件 | 职责 | 动作 |
|------|------|------|
| `src/types/model.ts` | 类型 | Create |
| `src/api/modelApi.ts` | CRM+auth API | Create |
| `src/pages/admin/AdminModelsPage.tsx` | 管理员模型页 | Create |
| `src/components/model/ModelSelector.tsx` | 复用选择器 | Create |
| `src/pages/dashboard/SettingsPage.tsx` | 加默认模型+BYOK 区 | Modify |
| 聊天区顶部 | 模型切换下拉 | Modify |
| `src/App.tsx`/`AdminSidebar.tsx`/`AdminLayout.tsx` | 路由+导航 | Modify |
| `src/i18n/locales/{zh,en}/*.json` | 文案 | Modify |

## 任务索引

### Part 1 — Java 模型目录（[part1](./2026-06-19-model-config-part1-java-model.md)）
- T1: AuthRoleSupport（admin 门，模块5 共用）
- T2: V16 迁移
- T3: AiModelEntity + Repo
- T4: UserModelEntity + AiModelPlanAccessEntity + Repos
- T5: ModelKeyCodec + ModelProperties + Bean
- T6: AiModelService（CRUD+套餐+默认+加密）
- T7: CrmModelController（管理员端点）
- T8: ModelBootstrap（env→DB 引导）

### Part 2 — Java 配额+透传+用户端点+计费（[part2](./2026-06-19-model-config-part2-java-quota.md)）
- T9: AuthModelBiz（可用列表+默认+BYOK+gating）
- T10: AuthModelController（用户端点）
- T11: AgentRunContextDto + AgentRunState + AgentContextAssembler 加 model_config
- T12: AgentModelResolver（解析用户模型）
- T13: AgentBridgeService byok 旁路配额
- T14: UsageReportRequest/Entity/Biz 加 byok/model_code/unit_cost

### Part 3 — python ModelRegistry+路由（[part3](./2026-06-19-model-config-part3-python-registry.md)）
- T15: model_registry.py（缓存+降级+报警去重）
- T16: model_routes.py（/internal/model/active+test+/internal/alert/model）
- T17: main.py 注册+预热

### Part 4 — python 透传+reporter+配置源（[part4](./2026-06-19-model-config-part4-python-loop.md)）
- T18: AgentRunContext 加字段
- T19: loop.py get_llm(config=) 透传
- T20: reporter._compute_cost + byok 跳过
- T21: crawl 配置源→ModelRegistry
- T22: rag embed 配置源→ModelRegistry
- T23: image 配置源→ModelRegistry

### Part 5 — 前端（[part5](./2026-06-19-model-config-part5-frontend.md)）
- T24: types/model.ts + modelApi.ts
- T25: AdminModelsPage
- T26: ModelSelector 组件
- T27: SettingsPage 默认模型+BYOK
- T28: 聊天区临时切换
- T29: 路由+导航+i18n
- T30: 端到端验证

## 执行约定
- **TDD**：每任务先写失败测试→跑红→实现→跑绿→提交。
- **频繁提交**：每任务一提交，前缀 `feat(model):`。
- **Java 测试**：`JAVA_HOME=/d/Programs/Java/jdk_21 mvn -pl <module> -am test`。
- **python 测试**：`cd python-ai && python -m pytest tests/test_model_*.py tests/test_reporter_cost.py -q`。
- **前端**：`cd frontend && npx vitest run`；`npx tsc --noEmit`。
- **本地验证**：`scripts/_restart-dev-stack.ps1`（CN 中间件）。
- **跨模块依赖**：T1 AuthRoleSupport 供模块5 复用；若模块5 先实现则跳过 T1。
