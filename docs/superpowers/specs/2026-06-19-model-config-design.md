# 模块 3：模型/APIkey 统一管理 — 设计文档（册 1）

> 范围：管理员配置全局模型目录（全部类型，含倍率/价格/key）+ 用户按套餐选模型（默认+临时切换）+ 用户私有 BYOK 模型（不计费）。
> 本册含 §1 架构总览 + §2 数据模型；§3–§4 见 [册2](./2026-06-19-model-config-design-part2.md)；§5–§7 见 [册3](./2026-06-19-model-config-design-part3.md)。
> 状态：已通过 brainstorming 全部 7 节确认，待用户复核后转 writing-plans。

## 背景与目标

当前模型配置**仅 python-ai env var**（`config.py` 的 openai_*/deepseek_*/crawl_llm_* 字段），无 DB 存储、无管理 UI、无运行时切换。`custom_model` feature gate 被挪用给封面图生成，per-user 模型选择完全未实现。`agent.default_model` site setting 是孤儿（存了从不消费）。python `reporter.py` 成本估算硬编码三档。

本模块交付：
1. 管理员全局模型目录（LLM/embedding/crawl/image 全类型），含 provider/protocol/base_url/key/价格/倍率/套餐关联
2. 用户按套餐选公共模型（默认 + 聊天临时切换）；用户私有 BYOK 模型（自带 key，不计费不计配额）
3. 模型价格+倍率数据源，供模块 2 计费消费（替换 reporter 硬编码）
4. python-ai 逐 run 透传 LLM 配置；embedding/crawl/image 启动+变更拉取活跃配置
5. 降级：单一平台默认模型兜底 + 报警上报

## 现状关键事实

- python-ai `LLMProvider`（`app/core/llm.py`）进程级单例，单 uvicorn worker；`get_llm(config=...)` 已支持按调用传 config（每次新建实例，llm.py:121）；`switch_provider` 仅在 2 硬编码 provider 间清缓存，无运行时注入新 model/key 的 hook
- LLM profiles：default/plan/fast（共享底座 config，plan/fast 调 max_tokens/timeout）+ crawl（独立 config）
- 无 DB 静态加密约定；`AesGcmCodec`（AES-GCM-256，`studio-platform-security`）可复用，需持久主密钥源
- `custom_model` feature gate 实际用于封面图（`NovelCoverService.java:39`），非模型选择；`AuthUser` 无模型偏好列
- CRM 管理区已存在（`/api/billing/crm/*` 等），复用模块 5 `AuthRoleSupport` 做 admin 门
- `usage_event` 有 `unit_cost_micros`（从未填）+ `total_cost_micros`（python 估算）
- `reporter.py:16-30` `_model_cost_micros` 硬编码 deepseek/gpt-4/默认三档

## §1 架构总览

```
[ Admin UI ]                 [ novel-studio :8080 ]                    [ python-ai :8000 ]
  模型目录 CRUD ──CRM──→  CrmModelController                          /internal/model/active
  (模型+倍率+套餐+         ├ ai_model 表(provider/protocol/model/        (按 type 返回活跃/默认配置
   key)                     base_url/key加密/价格/倍率/is_active)         LLM/embedding/crawl/image)
  用户选模型 ──auth──→    AuthModelController                         get_llm(config=<透传>)
  (默认+临时切换)          ├ user_model(默认偏好 + BYOK)               agent loop: get_llm(config=)
                          ├ 解密 key → 经 run context 传 python         embedding/crawl/image:
                          └ 套餐 gating(模型-套餐多对多)检查             ModelRegistry 拉取活跃配置
                                                                  (TTL 60s)，失败→平台默认+报警
```

### 核心流 A — LLM 逐 run 透传
1. 用户发消息 → Java `AgentBridgeService` 解析用户当前模型（临时覆盖 > 用户默认 > 平台默认）
2. 校验可用性（公共模型查模型-套餐关联；BYOK 查 owner）
3. 公共模型：Java 解密 `ai_model.api_key_enc` → 连同 provider/protocol/base_url/model/pricing 塞入 run context.model_config
4. python agent loop 调 `get_llm(profile="default", config=model_config)`（每次新建实例，不污染单例）
5. BYOK（用户 key）：同样透传，但 reporter 标 `byok=true` 跳过计费上报；Java 侧跳过配额检查

### 核心流 B — embedding/crawl/image 动态拉取
- python `ModelRegistry` 启动预热 + 60s TTL 轮询 `GET /internal/model/active?type=`
- `chapter_index.py`(embedding)/`crawl/runner.py`(crawl)/`image_routes.py`(image) 配置源改 ModelRegistry
- env 配置仅用于首次启动 `ModelBootstrap` 引导写 ai_model 表，运行期不再被 python 直接读

### 加密
`api_key_enc` 列用 `AesGcmCodec` 加密，主密钥 env `MODEL_KEY_ENCRYPTION_KEY`（32 字节 base64）。Java `ModelKeyCodec` 封装；明文仅 Java→python 内网单跳（`X-Internal-Service-Key` 鉴权），不落日志、不回显前端。

### 降级与报警（单一默认模型）
任何模型类型在透传/拉取失败时，**只能降级到该 type 的平台默认模型**（`ai_model.is_default=true AND is_active=true`），不降级 env、不用多候选。降级即报警：python POST `/internal/alert/model` → Java 落 `model_alert` + CRM 红色提示。默认模型也取不到 → severity=error + 请求失败。

### 与计费（模块 2）的接口
模型表存 `input_price_per_1k_micros`/`output_price_per_1k_micros`/`price_multiplier`，透传到 run context.pricing。python `reporter.py` 读 pricing 替代硬编码。BYOK 跳过上报。`usage_event` 加 `byok`/`model_code` 列供模块 2 统计。

## §2 数据模型

### 新增表 `ai_model`（全局模型目录，管理员维护）

```sql
CREATE TABLE ai_model (
    id              VARCHAR(36) PRIMARY KEY,
    code            VARCHAR(64) NOT NULL UNIQUE,       -- 内部码 'gpt-4o','minimax-m2.7'
    display_name    VARCHAR(120) NOT NULL,
    model_type      VARCHAR(16) NOT NULL,              -- 'llm'|'embedding'|'crawl'|'image'
    provider        VARCHAR(32) NOT NULL,              -- 'openai'|'anthropic'|'deepseek'|'minimax'|...
    protocol        VARCHAR(16) NOT NULL,              -- 'openai'|'anthropic'
    model_name      VARCHAR(120) NOT NULL,             -- 调 API 的 model 字段值
    base_url        VARCHAR(512) NOT NULL,
    api_key_enc     TEXT NOT NULL,                     -- AesGcmCodec 加密
    max_tokens      INTEGER,
    temperature     DOUBLE PRECISION,
    input_price_per_1k_micros  BIGINT,                 -- 每 1k input token 微分
    output_price_per_1k_micros BIGINT,
    price_multiplier DECIMAL(6,3) NOT NULL DEFAULT 1.000,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,    -- 每 type 平台默认（各一）
    sort_order      INTEGER NOT NULL DEFAULT 0,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_ai_model_type_active ON ai_model (model_type, is_active);
CREATE UNIQUE INDEX uq_ai_model_default_per_type ON ai_model (model_type) WHERE is_default = TRUE;
```
- `is_default` 每 type 最多一条（部分唯一索引保证）
- 价格单位 micros（1/1_000_000 元），与 `usage_event.cost_micros` 一致；null = 不计费（如内部 embedding/crawl/image 可不标价）

### 新增表 `ai_model_plan_access`（模型-套餐多对多）

```sql
CREATE TABLE ai_model_plan_access (
    model_id  VARCHAR(36) NOT NULL,
    plan_code VARCHAR(32) NOT NULL,        -- 关联 product_plan.code
    PRIMARY KEY (model_id, plan_code)
);
```
用 `plan_code`（非 `plan_id`）——与 V4 seed 用 code 关联一致，避免 plan 重建 id 变。

### 新增表 `user_model`（用户默认模型 + BYOK）

```sql
CREATE TABLE user_model (
    id              VARCHAR(36) PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    model_type      VARCHAR(16) NOT NULL DEFAULT 'llm',
    -- 公共模型引用
    public_model_id VARCHAR(36),                       -- 引用 ai_model.id
    -- 私有 BYOK（自带 key）
    label           VARCHAR(120),
    provider        VARCHAR(32),
    protocol        VARCHAR(16),
    model_name      VARCHAR(120),
    base_url        VARCHAR(512),
    api_key_enc     TEXT,                               -- 用户自带 key（加密）
    is_byok         BOOLEAN NOT NULL DEFAULT FALSE,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,    -- 每 (user,type) 一条
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_user_model_user ON user_model (user_id, model_type);
CREATE UNIQUE INDEX uq_user_model_default ON user_model (user_id, model_type) WHERE is_default = TRUE;
```
- 一条 `user_model` 要么引用公共（`public_model_id` 非 null），要么 BYOK（`is_byok=true` + 自带字段）
- `is_default` 每 (user, type) 一条

### 临时覆盖
不落库——前端发消息时在 `RunRequest` 带 `modelOverride`（`{userModelId}` 或 `{publicModelId}`），Java 校验后透传。

### usage_event 扩展
```sql
ALTER TABLE usage_event ADD COLUMN IF NOT EXISTS byok BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE usage_event ADD COLUMN IF NOT EXISTS model_code VARCHAR(64);
```

### 实体/Repo
`AiModelEntity` / `UserModelEntity` + Repos；`AiModelPlanAccessEntity`（复合主键 `@IdClass(AiModelPlanAccessPk)`）或 repo `@Query` 管理；`UsageEventEntity` 扩展 2 字段。

---
§3 API 契约 + §4 计费集成 见 [册2](./2026-06-19-model-config-design-part2.md)。
