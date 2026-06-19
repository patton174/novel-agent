# 模块 3：模型/APIkey 统一管理 — 设计文档（册 3）

> 本册含 §5 python 集成 + §6 前端 + §7 收尾；§1–§2 见 [册1](./2026-06-19-model-config-design.md)；§3–§4 见 [册2](./2026-06-19-model-config-design-part2.md)。

## §5 python-ai 集成层

### LLM 逐 run 透传

agent loop 当前 `llm_provider.get_llm(profile="default")`（loop.py:346）读全局 settings。改为优先用 run context 的 `model_config`：
```python
model_config = ctx.model_config
llm = llm_provider.get_llm(profile="default", config=model_config) if model_config else llm_provider.get_llm(profile="default")
```
`get_llm(config=...)` 已存在（llm.py:121，每次新建实例不污染单例）。**改动点**：`AgentRunContext` 加 `model_config` 字段；loop 各调用点（default/plan/fast）透传。

profile 语义保留：plan/fast 仍按 profile 调整 max_tokens/timeout（llm.py:51-58），但底座 config（provider/key/base_url/model）来自透传的 model_config。即 `_resolve_config` 当传入 config 时直接用 config，profile 仅覆盖 max_tokens/timeout。

### embedding/crawl/image 动态拉取

新建 `app/core/model_registry.py`（替代这三类直接读 settings）：
```python
class ModelRegistry:
    """活跃模型配置缓存（embedding/crawl/image）。失败→平台默认+报警。"""
    _cache: dict[str, dict] = {}        # type -> config
    _fetched_at: dict[str, float] = {}
    _alerted: dict[str, float] = {}     # 去重：同 type+reason 60s 内一次
    TTL_SEC = 60

    def get(self, model_type: str) -> dict:
        # 1. TTL 内返回缓存
        # 2. 缓存空 → 拉 /internal/model/active?type=
        # 3. 拉取失败 → 拉 /internal/model/active?type=&default=true（平台默认）
        #    命中：用默认 + POST /internal/alert/model {severity:warn}
        #    默认也空：POST 报警 {severity:error} + 抛异常
        # 不降级 env
```
- `chapter_index.py`(embedding)：`settings.rag_embed_*` → `model_registry.get("embedding")`
- `crawl/runner.py`(crawl LLM)：`get_crawl_llm_config()` → `model_registry.get("crawl")`
- `image_routes.py`(image)：相应配置 → `model_registry.get("image")`
- 启动时 `main.py` 预热拉取（best-effort）

### 报警去重
拉取失败可能高频，`_alerted` 记录同 `(model_type, reason)` 上次报警时间，60s 内仅上报一次，避免风暴。

### 连通性测试 `/internal/model/test`
```python
@internal_router.post("/model/test")
async def test_model(body: ModelTestRequest, x_internal_service_key=Header(...)):
    _verify_internal_key(x_internal_service_key)
    try:
        llm = llm_provider._create_llm(body.config)
        await llm.ainvoke([HumanMessage(content="ping")])
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}
```

### pricing 透传到 reporter
`AgentRunContext` 加 `pricing` + `byok` + `model_code`；`report_llm_usage` 从 context 取（§4）。reporter 不再读 `_model_cost_micros` 硬编码。

### 降级（单一默认模型 + 报警）
任何模型类型在透传/拉取失败时，**只能降级到该 type 平台默认模型**（`ai_model.is_default=true AND is_active=true`），不降级 env、不用多候选。降级即报警（warn）；默认也取不到 → error + 请求失败。

LLM 透传同理：run context 无 model_config → 用平台默认 LLM + warn 报警（而非旧全局 settings）。

env 配置从此**仅用于首次启动 `ModelBootstrap` 引导写 ai_model 表**，运行期不再被 python 直接读。

## §6 前端

### 管理员：模型管理页 `AdminModelsPage.tsx`（路由 `/admin/models`）
- 模型目录列表（按 type 分 tab：LLM/Embedding/Crawl/Image），每行：展示名、provider、model_name、倍率、状态(启用/默认徽章)、操作(编辑/删/设默认/测试连通)
- 新建/编辑模型弹窗：provider/protocol/model_name/base_url/api_key(密码框)/max_tokens/temperature/价格(input/output per 1k)/倍率/is_active
- 套餐关联编辑：多选 plan（hobby/pro/enterprise）
- 连通性测试按钮：调 `/crm/model/{id}/test`，显示 ok/错误

### 用户：模型选择
- `SettingsPage.tsx` 加"默认模型"区：下拉选默认 LLM（来自 `/auth/model/available`，公共+BYOK），显示当前套餐可用公共模型
- BYOK 管理：列表 + 新建/编辑/删除私有模型弹窗（label/provider/protocol/model_name/base_url/api_key）
- 聊天区顶部加**模型切换下拉**（临时覆盖，不落库）：显示当前用模型，切换后该会话后续 run 带 modelOverride

### 模型选择器组件 `ModelSelector.tsx`（复用）
- 下拉项：公共模型（按套餐可用，禁用不可用的并提示升级）+ "我的私有模型"分组（BYOK）
- 当前选中 + 倍率/价格提示（tooltip）

### API client `modelApi.ts`
CRM CRUD/套餐/默认/测试 + auth available/default/byok + run override 类型。

### 计费可见性
模型项显示倍率/价格（`×1.5`），让用户感知成本；BYOK 项标"私有·不计费"。

### 最小可视路径
1. admin 配一个 GPT-4o 模型（key+价+倍率+关联 pro 套餐）
2. pro 用户 Settings 设为默认 → 发消息 → 用 GPT-4o，按倍率计费
3. 聊天区临时切回平台默认模型
4. 用户加 BYOK 私有模型 → 选中 → 发消息 → 不计费

## §7 安全 / 测试 / 迁移 / 文件清单 / 边界

### 安全
- **API key 静态加密**：`AesGcmCodec`（AES-GCM-256），主密钥 env `MODEL_KEY_ENCRYPTION_KEY`（32 字节 base64）。Java `ModelKeyCodec` 封装，仅运行时解密明文透传 python，不落日志、不回显前端
- **key 回显掩码**：所有 GET 端点返回 `api_key_masked`（如 `sk-****1234`），明文仅 Java→python 内网单跳
- **BYOK own 校验**：用户私有模型增删改查均按 `user_id` 过滤
- **CRM admin 门**：`AuthRoleSupport.requireAdmin`
- **套餐 gating**：用户选公共模型时校验模型-套餐关联，不可用则 403 + 提示升级
- **透传安全**：model_config 含明文 api_key，仅走 Java→python 内网；python 不记录 api_key 到 trace

### DB 迁移（`V16__ai_model.sql`，content 模块）
- 建 `ai_model` + 索引 + 部分唯一索引（default per type）
- 建 `ai_model_plan_access`
- 建 `user_model` + 索引 + 部分唯一索引（default per user per type）
- `usage_event` 加 `byok BOOLEAN` + `model_code VARCHAR(64)` 列
- **seed 默认模型**：Flyway 迁移读 env 不便，改用应用启动 `ModelBootstrap`（`ApplicationRunner`）首次引导——表空时从 env 读默认模型写入 ai_model，每 type 一条 is_default=true

### 配置项
```yaml
app:
  model:
    key-encryption-key: ${MODEL_KEY_ENCRYPTION_KEY:}   # 必填，空则启动失败
    python-base-url: ${PYTHON_AI_BASE_URL:http://127.0.0.1:8000}
```

### 测试
- **Java**：`ModelKeyCodec` 加解密往返单测；`AiModelService` CRUD+套餐+默认互斥单测；`AuthModelBiz` 套餐 gating+BYOK own 校验单测；`AgentContextAssembler` 模型解析（临时覆盖>默认>平台默认）+ byok 旁路配额单测
- **python**：`ModelRegistry` 缓存/降级/报警去重单测（mock Java 响应）；`reporter._compute_cost` 单测（含 byok 跳过）；`/internal/model/test` 端点单测
- **集成**：admin 建模型→用户选默认→发消息用选定模型→usage_event 记正确 model_code/cost；BYOK→不计费；降级→报警落库

### 关键文件清单

**Java（novel-studio）**
- `studio-module-content`：`entity/{AiModelEntity,UserModelEntity,AiModelPlanAccessEntity}` + Repos、`controller/crm/CrmModelController`、`controller/auth/AuthModelController`、`service/AiModelService`(CRUD+套餐+默认+key 加解密)、`service/auth/biz/AuthModelBiz`(可用列表+默认+BYOK+gating)、`support/ModelKeyCodec`、`config/ModelProperties`
- `studio-module-agent`：`AgentContextAssembler` 扩展（解析模型→塞 context.model_config）、`AgentBridgeService` 扩展（byok 旁路配额）
- `studio-module-billing`：`UsageReportBiz` 改用 python 上报 cost + `usage_event` byok/model_code 列、`UsageEventEntity` 扩展
- `studio-module-worker`：`ModelAlertListener`（接收 python 报警落库）
- 迁移 `V16__ai_model.sql` + `ModelBootstrap` ApplicationRunner

**python-ai**
- `app/core/model_registry.py`（活跃模型缓存+降级+报警去重）
- `app/api/model_routes.py`（`/internal/model/active`+`/test`+`/internal/alert/model`）
- `app/agent/`：`AgentRunContext` 加 model_config/pricing/byok；loop 透传；`reporter.py` 改造
- `app/crawl/runner.py`、`app/rag/chapter_index.py`、`app/api/image_routes.py`：配置源改 ModelRegistry
- `app/main.py`：注册 model_routes + 启动预热
- `tests/test_model_registry.py`、`tests/test_reporter_cost.py`

**前端**
- `src/pages/admin/AdminModelsPage.tsx`、`src/components/model/ModelSelector.tsx`、`src/api/modelApi.ts`、`src/types/model.ts`
- `SettingsPage.tsx` 加默认模型 + BYOK 区
- 聊天区顶部模型切换下拉
- 路由 + admin 侧栏 + i18n

### 范围边界（YAGNI，本模块不做）
- ❌ 支付/续费/自助升级（模块 2）
- ❌ RPM 限流（模块 2）
- ❌ 模型用量按模型维度统计看板（模块 2 消费 byok/model_code 列）
- ❌ 模型 A/B 测试、自动 fallback 链
- ❌ 多 region/endpoint 故障转移
- ❌ 模型配置版本化/回滚
- ❌ 嵌入式模型微调管理

### 风险与备注
- **python 单进程**：ModelRegistry 进程内缓存，单 uvicorn worker 下全局一致；未来多 worker 需迁 Redis 缓存
- **key 旋转**：更换 `MODEL_KEY_ENCRYPTION_KEY` 需重加密所有 key（提供 reencrypt 端点/脚本）
- **降级报警风暴**：`_alerted` 去重（同 type+reason 60s 内仅一次）
- **env→DB 引导**：首次部署 `ModelBootstrap` 从 env 写默认模型；后续 env 不再被运行期读取，env 改了不生效（需 admin 改 DB）——文档说明
