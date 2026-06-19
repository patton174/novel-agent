# 模块 3：模型/APIkey 统一管理 — 设计文档（册 2）

> 本册含 §3 API 契约 + §4 计费集成；§1–§2 见 [册1](./2026-06-19-model-config-design.md)；§5–§7 见 [册3](./2026-06-19-model-config-design-part3.md)。

## §3 API 契约

### 管理员端点（`/api/content/crm/model/*`，admin 门 via `AuthRoleSupport`）

**模型目录 CRUD**
```
POST   /api/content/crm/model               建模型（api_key 明文→加密落盘）
PUT    /api/content/crm/model/{id}          更新（api_key 为空时保留旧值）
DELETE /api/content/crm/model/{id}          删除（被 user_model 引用时拒绝）
GET    /api/content/crm/model?type=&page=   列表（key 不回显）
GET    /api/content/crm/model/{id}          详情（key 返回掩码 "sk-****1234"）
POST   /api/content/crm/model/{id}/test     连通性测试（Java→python /internal/model/test）
```

**套餐关联 + 默认设置**
```
PUT    /api/content/crm/model/{id}/plans    设可用套餐（body: {planCodes:["hobby","pro"]}，全量覆盖）
POST   /api/content/crm/model/{id}/default  设为该 type 平台默认（先清同 type 其他 default）
```

### 用户端点（`/api/content/auth/model/*`，X-User-Id）

**可选模型列表**（按套餐过滤 + 含自己 BYOK）
```
GET /api/content/auth/model/available?type=llm
  → { public: [AiModelDTO...], byok: [UserModelDTO...] }
  （public 仅含当前套餐可用的；key 不回显；byok 含自己的）
```

**默认模型**
```
GET  /api/content/auth/model/default?type=llm   → 当前默认（null=用平台默认）
PUT  /api/content/auth/model/default            body: {type, userModelId}
```

**BYOK 私有模型管理**
```
POST   /api/content/auth/model/byok            建私有模型（label/provider/protocol/model_name/base_url/api_key）
PUT    /api/content/auth/model/byok/{id}        更新（own 校验）
DELETE /api/content/auth/model/byok/{id}        删除（own 校验）
```

### Run 时模型透传（扩展 AgentRunContextDto）

Java→python 的 run context 新增字段：
```json
"model_config": {
  "model_type": "llm",
  "provider": "openai",
  "protocol": "openai",
  "model_name": "gpt-4o",
  "base_url": "https://...",
  "api_key": "<明文，运行时解密>",
  "max_tokens": 8192,
  "temperature": 0.7,
  "pricing": { "input_per_1k_micros": 2500, "output_per_1k_micros": 10000, "multiplier": 1.5 },
  "byok": false,
  "source": "public|byok|platform_default"
}
```
- `api_key` 明文仅 Java→python 单跳（内网 `X-Internal-Service-Key` 鉴权，不落 python 日志）
- 临时覆盖：`RunRequest` 可带 `modelOverride: {userModelId}` 或 `{publicModelId}`，Java 校验可用性后写入 context.model_config

### python-ai 端点

**活跃/默认配置拉取**
```
GET /internal/model/active?type=embedding&default=true   (X-Internal-Service-Key)
  → { provider, protocol, model_name, base_url, api_key, max_tokens, temperature, pricing, code }
  或 404（无配置）
```

**连通性测试**
```
POST /internal/model/test   (X-Internal-Service-Key, body: model_config)
  → python 用该 config 建临时 LLM 发 ping，返回 {ok:true} / {ok:false, error}
```

**报警上报**
```
POST /internal/alert/model   (X-Internal-Service-Key)
  body: { model_type, reason, fallback_model_code, severity: "warn"|"error" }
  → Java 落 model_alert + CRM 提示
```

### 鉴权与隔离
- CRM 端点：`AuthRoleSupport.requireAdmin(X-User-Roles)`
- 用户端点：`X-User-Id`；BYOK 增删改均 own 校验；可选列表按套餐过滤公共模型
- `/internal/model/*` + `/internal/alert/model`：`X-Internal-Service-Key`
- key 回显：任何 GET 返回 `api_key` 均掩码；明文仅 Java 解密后透传 python

## §4 计费集成（与模块 2 的接口点）

本模块只交付**模型侧计费数据源**，模块 2（计费完善）后续消费。明确接口契约避免两模块脱节。

### 价格数据流
```
ai_model.input/output_price_per_1k_micros + price_multiplier
   ↓ (admin 配置)
Java 解析用户模型 → run context.model_config.pricing
   ↓ (逐 run 透传)
python agent loop 每 LLM 步 → reporter.report_llm_usage()
   ↓ (读 context.pricing 替代硬编码)
HTTP POST /internal/billing/usage/report { unit_cost_micros, total_cost_micros, byok, model_code }
   ↓
Java UsageReportBiz 持久化 usage_event
```

### reporter.py 改造（python-ai `app/billing/reporter.py`）

当前 `_model_cost_micros(model)` 硬编码 deepseek/gpt-4/默认三档（reporter.py:16-30）。改为：
```python
def _compute_cost(input_tokens, output_tokens, pricing: dict | None):
    if pricing is None:
        return None  # 无定价信息，不计费
    inp = pricing.get("input_per_1k_micros") or 0
    out = pricing.get("output_per_1k_micros") or 0
    mult = pricing.get("multiplier") or 1.0
    cost = (input_tokens * inp + output_tokens * out) / 1000 * mult
    return int(cost)
```
`report_llm_usage(...)` 从 run context 取 `pricing` + `byok` + `model_code`：
- `byok=true`（私有模型）→ **跳过上报**（完全不计费），仅本地 trace 记 token 用量
- `byok=false` + pricing 非空 → 上报 `unit_cost_micros`（每 1k 单价）+ `total_cost_micros`（计算值）
- `byok=false` + pricing 为空 → 上报 token 数但 cost=0（兜底）

### Java 侧 usage_event 字段对齐
`usage_event` 现有 `unit_cost_micros`（从未填）+ `total_cost_micros`（python 估算填）。本模块让 `unit_cost_micros` 真正落地（每 1k 单价，便于模块 2 价目审计）。`UsageReportBiz.persistReport` 改为信任 python 上报的 cost（python 已用模型表精确价），不再自己重算。

### 配额（BYOK 跳过）
- 公共模型：`byok=false` → 照常计配额（`QuotaBiz.checkAndReserveRun` 已在 run 前）
- 私有模型：`byok=true` → **跳过配额检查**。Java `AgentBridgeService` 解析模型后，若 byok=true 则跳过 `quotaGateService.assertCanStartRun`。用量仍记录到 `usage_event`（标 `byok=true`，cost=0）供统计。

### 接口契约（供模块 2 后续消费）
- `ai_model` 表：价目表（input/output/multiplier）—— 模块 2 的"Java 侧模型价目表"需求由本表满足
- `usage_event.byok` 列（BOOLEAN）—— 区分 BYOK 用量，模块 2 统计/展示
- `usage_event.model_code` 列（VARCHAR）—— 记录所用模型码，模块 2 按模型维度统计

本模块交付：ai_model 价目 + reporter 改造 + byok 旁路计费/配额 + usage_event 加 byok/model_code 列。**支付/续费/RPM 限流等仍属模块 2**，不在本模块。

---
§5 python 集成 + §6 前端 + §7 收尾 见 [册3](./2026-06-19-model-config-design-part3.md)。
