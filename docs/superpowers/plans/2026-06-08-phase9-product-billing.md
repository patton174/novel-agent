# Phase 9 实施计划：产品计量、配额与计费

> **目标**：建立不可变计量账本、实时配额 enforcement、用户用量透明化；Pricing/Billing 页接真实 API。  
> **周期**：约 4 周  
> **前置**：Phase 8 T8.1（Flyway）必须完成  
> **设计规格**：`docs/superpowers/specs/2026-06-08-platform-operations-design.md` §4–§7

---

## 任务总览

| # | 任务 | 侧 | 验证 |
|---|------|----|------|
| T9.1 | 新建 agent-billing 模块 + Flyway V2 表 | java | 模块启动、表存在 |
| T9.2 | 套餐 seed + 公开 plans API | java/fe | Pricing 页动态渲染 |
| T9.3 | python-ai LLM 用量上报 | py | 每次调用产生 usage_event |
| T9.4 | PyAI 配额预检 + 402 响应 | java | 超配额拦截 |
| T9.5 | MQ Consumer 落库 + Redis 计数 | java | PG/Redis 一致 |
| T9.6 | 用户 usage API（current/trends/events） | java/fe | Billing 页真数据 |
| T9.7 | user_subscription + 注册默认 hobby | java | 新用户有 plan |
| T9.8 | Run 级追溯 + trace_id 写入 event | 全栈 | 明细可下钻 runId |
| T9.9 | 模型单价配置 + cost 计算 | py/java | cost_micros 非零 |
| T9.10 | 配额告警（80%/100%）与响应头 | java/fe | 接近上限有提示 |

---

## T9.1 — agent-billing 模块

### 模块结构

```
novel-agent/agent-service/agent-billing/
  pom.xml
  src/main/java/com/novel/agent/billing/
    NovelAgentBillingApplication.java
    entity/          ProductPlan, UsageEvent, UsagePeriodSummary, UserSubscription
    repository/
    service/
      biz/           QuotaBiz, UsageReportBiz, PlanBiz, UsageQueryBiz
      consumer/      UsageEventListener
    controller/
      auth/          BillingAuthController      # /api/billing/auth/*
      crm/           BillingCrmController       # /api/billing/crm/*
      internal/      InternalUsageController    # /internal/billing/*
  src/main/resources/
    application.yml
    db/migration/
      V2__billing_schema.sql    # 见 design spec §4
      V3__seed_plans.sql
```

### Gateway 路由

`application.yml`（gateway）新增：

```yaml
spring.cloud.gateway.routes:
  - id: agent-billing
    uri: lb://agent-billing
    predicates:
      - Path=/api/billing/**
```

### Docker

`docker-compose.worker.yml` 增加 `agent-billing` 服务（端口 8092），`mem_limit` 256m。

### 验证

```bash
cd novel-agent && mvn -B -pl agent-billing -am package -DskipTests
curl http://localhost:8092/actuator/health
```

### DoD

- [ ] 模块纳入 `deploy-fast.sh` / CI 路径 filter
- [ ] Nacos 注册 `agent-billing`

---

## T9.2 — 套餐 seed + Plans API

### V3__seed_plans.sql

插入 `hobby` / `pro` / `enterprise` 及 `plan_feature`（对齐现 `PricingPage.tsx` 文案）。

### API

```
GET /api/billing/auth/plans
→ [{ code, name, priceCents, currency, monthlyTokenQuota, features[], highlight? }]
```

`highlight` 可由 `sort_order` 或 plan 表字段 `is_featured` 控制。

### 前端

**修改** `frontend/src/pages/PricingPage.tsx`：

- 删除硬编码 `TIERS`
- `useEffect` 调 `fetchPlans()` from `billingApi.ts`
- CTA：`/register`（hobby）或 `/dashboard/billing`（升级）

### 验证

```bash
curl -s https://staging.novel-agent.cn/api/billing/auth/plans | jq
cd frontend && pnpm exec vitest run src/pages/PricingPage.test.tsx  # 新建 mock API 测试
```

---

## T9.3 — python-ai 用量上报

### 改动

**新建** `python-ai/app/billing/reporter.py`：

```python
async def report_llm_usage(
    *,
    user_id: int,
    run_id: str,
    session_id: str | None,
    trace_id: str | None,
    model: str,
    usage: dict[str, int],
    metadata: dict | None = None,
) -> None:
    """POST internal billing API; 失败写本地 spill 文件重试。"""
```

**挂钩点** `app/agent/harness/main_loop_llm.py` — `log_llm_exchange` 之后：

```python
await report_llm_usage(
    user_id=ctx.user_id,
    run_id=ctx.run_id,
    ...
    usage=extract_cache_usage(ai_msg),
)
```

**上下文**：`PlanRequest` / run context 需携带 `user_id`、`trace_id`（Java 组装 context 时已传 userId，补 trace header 透传）。

**配置**：

```
BILLING_REPORT_URL=http://agent-pyai:8082/internal/billing/usage/report
# 或直连 agent-billing:8092
BILLING_REPORT_ENABLED=true
```

### 单测

`tests/test_billing_reporter.py`：mock httpx，验证 payload schema。

### 验证

```bash
cd python-ai && python -m pytest tests/test_billing_reporter.py -q
# 联调：跑一轮 agent → PG SELECT count(*) FROM usage_event WHERE user_id=?
```

---

## T9.4 — PyAI 配额预检

### 改动

**新建** `agent-pyai/.../QuotaGateService.java`：

```java
public void assertCanStartRun(long userId) {
    // 读 Redis billing:usage:{userId}:{yyyyMM}:tokens / runs
    // 读 plan quota（cache billing:plan:{userId}）
    // 超 quota → throw QuotaExceededException(402, body with usage snapshot)
}
```

**修改** `AgentStreamController` / `AgentBridgeService` stream 入口：

```java
quotaGateService.assertCanStartRun(userId);
```

**Run 开始时** `INCR billing:usage:{userId}:{yyyyMM}:runs`（或等首条 usage_event 消费后计数，二选一，文档注明策略）。

### Gateway（可选 Phase 9.5）

轻量 GET 不拦截；仅 stream POST 在 PyAI 拦截即可。

### 单测

`QuotaGateServiceTest`：Mock Redis，超配额抛 402。

### 验证

```bash
# 测试账号 hobby 10k quota，灌数据至 10001
curl -X POST .../api/agent/chat/stream → 402
body: { "code": 402, "msg": "...", "data": { "tokensUsed": 10001, "quota": 10000 } }
```

---

## T9.5 — MQ Consumer 落库

### 消息契约

```java
public record UsageReportMessage(
    Long userId,
    String runId,
    String sessionId,
    String traceId,
    String eventType,
    String model,
    int inputTokens,
    int outputTokens,
    int cacheReadTokens,
    int cacheWriteTokens,
    long totalCostMicros,
    String metadataJson
) {}
```

### 流程

1. PyAI `InternalUsageController` 收 report → publish `usage.event`
2. `agent-billing` `UsageEventListener` 或 `agent-consumer` 新 listener：
   - INSERT `usage_event`（幂等：`UNIQUE(run_id, event_seq)` 或 messageId）
   - UPSERT `usage_period_summary`
   - Redis INCRBY tokens

### 验证

```bash
# 压测 100 条 report，usage_event 100 行，无 duplicate
cd novel-agent && mvn -B -pl agent-billing test -Dtest=UsageEventListenerTest
```

---

## T9.6 — 用户 Usage API + Billing 页

### API

| 路径 | 响应 |
|------|------|
| `GET /api/billing/auth/usage/current` | `{ period, tokensUsed, tokenQuota, runsUsed, runQuota, costMicros, percentUsed }` |
| `GET /api/billing/auth/usage/trends?days=30` | `{ points: [{ date, tokens, costMicros }] }` |
| `GET /api/billing/auth/usage/events?page=1&pageSize=20&runId=` | 分页明细 |
| `GET /api/billing/auth/subscription` | `{ planCode, planName, periodEnd, status }` |

### 前端

**新建** `frontend/src/api/billingApi.ts`

**重写** `frontend/src/pages/dashboard/BillingPage.tsx`：

- 删除所有硬编码数字
- 用量进度条 = `tokensUsed / tokenQuota`
- 明细 Table：时间、类型、模型、Token、费用、runId（Link to `/editor?runId=` 或 modal）
- Loading / Error 态

**新建** `frontend/src/pages/dashboard/BillingPage.test.tsx`

### 验证

```bash
cd frontend && pnpm test && pnpm tsc --noEmit
# 人工：Billing 页数字与 PG usage_period_summary 一致
```

---

## T9.7 — 订阅与注册默认 plan

### 逻辑

- 注册成功 → INSERT `user_subscription(user_id, plan_id=hobby, status=active, period=本月)`
- 现有用户 migration：`V4__backfill_subscriptions.sql` 全员 hobby，vip role → pro plan

### role 与 plan 关系（过渡期）

| AuthUser.role | 默认映射 plan |
|---------------|---------------|
| user | hobby |
| vip | pro |
| admin | pro（或 enterprise，可配置） |

JWT 仍带 `role`；配额 **以 subscription 为准**，role 仅权限。

### 验证

新注册用户 `SELECT * FROM user_subscription WHERE user_id=?`

---

## T9.8 — Run 级追溯

### 要求

- 每条 `usage_event` 含 `run_id`、`trace_id`
- Billing 明细点击 runId → `GET /api/billing/auth/usage/events?runId=xxx` 展示该 run 所有 LLM 调用
- 可选：`GET /api/agent/run/{runId}/summary`（pyai 已有 run 状态）返回 sessionId 供跳转编辑器

### 前端

明细行 runId 链接：`/editor/${sessionId}?highlightRun=${runId}`（按现有路由调整）

### 验证

一次对话产生 N 条 usage_event，同一 run_id；Loki 用 trace_id 可搜全链路。

---

## T9.9 — 模型单价与 cost 计算

### Nacos `billing.model_prices.yaml`

```yaml
billing:
  model_prices:
    deepseek-chat:
      input_per_1k_micros: 140
      output_per_1k_micros: 280
  default_currency: CNY
```

### 计算位置

优先 **python-ai 上报时** 算好 `total_cost_micros`（billing 服务可 audit 重算）。

### 单测

`test_billing_cost.py`：给定 token 数 → 预期 micros。

---

## T9.10 — 配额告警 UX

### 后端

配额 ≥ 80%：响应头 `X-Quota-Warning: token:0.82`

### 前端

- `BillingPage` 顶栏 amber 提示
- `DashboardHeader` 可选小 badge
- 编辑器发消息前调 `GET usage/current`（SWR 缓存 60s），接近上限 toast

### 邮件（可选，Phase 10）

80% 发 Mailtrap/生产邮件一次/月。

---

## Phase 9 完成定义

| 检查项 | 标准 |
|--------|------|
| 计量准确性 | 抽样 10 次 run，SSE run_usage 与 PG sum 偏差 < 5% |
| 配额拦截 | hobby 用户超 10k tokens 无法开新 stream |
| Billing 页 | 零硬编码，数据来自 API |
| Pricing 页 | 改 DB plan 价格，刷新即变 |
| 测试 | billing 模块 ≥ 15 单测；python reporter 有测试；BillingPage 有测试 |
| 部署 | staging 全链路跑通后再 prod |

---

## 文件清单

| 操作 | 路径 |
|------|------|
| 新建 | `agent-service/agent-billing/**` |
| 新建 | `agent-feign/agent-feign-billing/**`（若 pyai 需 Feign） |
| 新建 | `python-ai/app/billing/**` |
| 修改 | `python-ai/app/agent/harness/main_loop_llm.py` |
| 修改 | `agent-pyai/.../AgentStreamController.java` |
| 修改 | `frontend/src/pages/PricingPage.tsx`、`BillingPage.tsx` |
| 新建 | `frontend/src/api/billingApi.ts` |
| 修改 | `.github/workflows/deploy-split.yml` paths → billing |
| 修改 | `agent-gateway` routes |

---

## 与 Phase 8/10 衔接

- **Phase 8**：Flyway V1 baseline → 本 Phase V2+ billing 表
- **Phase 10**：CRM 套餐编辑、支付、审计、成本看板、站点 CMS
