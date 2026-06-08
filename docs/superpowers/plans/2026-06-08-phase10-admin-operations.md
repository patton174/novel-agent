# Phase 10 实施计划：管理运营、站点与支付

> **目标**：Admin 运营闭环（套餐管理、成本看板、用户配额 override、站点 CMS、审计日志）；支付订阅与发票雏形。  
> **周期**：约 4 周  
> **前置**：Phase 9 计量账本与 usage API 已上线  
> **设计规格**：`docs/superpowers/specs/2026-06-08-platform-operations-design.md` §4.3–§5.2、§8

---

## 任务总览

| # | 任务 | 侧 | 验证 |
|---|------|----|------|
| T10.1 | Admin 套餐管理 CRUD | java/fe | 改价后 Pricing/Billing 同步 |
| T10.2 | Admin 用户用量 + 订阅编辑 | java/fe | Users 页可改 plan/override |
| T10.3 | 平台成本与收入看板 | java/fe | MRR/Token/成本图表 |
| T10.4 | 站点 CMS（privacy/terms/contact/公告） | java/fe | 法律页非占位 |
| T10.5 | 审计日志 | java/fe | Admin 操作可追溯 |
| T10.6 | 系统参数页（注册开关、默认模型等） | java/fe | Nacos 或 DB 配置 |
| T10.7 | Stripe/支付宝 checkout + webhook | java/fe | 付费后 plan 升级 |
| T10.8 | 发票/账单 PDF 雏形 | java/fe | 用户可下载本月账单 |
| T10.9 | 账户设置页恢复 + 订阅管理 UI | fe | `/dashboard/settings` 可用 |
| T10.10 | 功能门控（plan_feature enforcement） | java | 非 Pro 无法 PDF 导出等 |

---

## T10.1 — Admin 套餐管理

### API（已有 Phase 9 基础表，本任务补 CRM CRUD）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/billing/crm/plans` | 含 inactive |
| POST | `/api/billing/crm/plans` | 新建 |
| PUT | `/api/billing/crm/plans/{id}` | 改价/配额/features |
| DELETE | `/api/billing/crm/plans/{id}` | 软删 `is_active=false` |

**审计**：每次变更写 `audit_log`（T10.5）。

### 前端

**新建** `frontend/src/pages/admin/PlansPage.tsx`：

- 表格：code、名称、月价、Token 配额、Run 配额、RPM、状态
- 编辑 Dialog：features 多选 checkbox
- 「设为主推」toggle → `is_featured`

**修改** `AdminSidebar.tsx`：

```typescript
{ label: '套餐管理', to: '/admin/plans', icon: CreditCard },
```

**新建** `frontend/src/api/billingAdminApi.ts`

### 验证

```bash
Admin 改 pro 价格为 ¥129 → Pricing 页显示 ¥129
audit_log 有 plan.update 记录
```

---

## T10.2 — Admin 用户用量与订阅

### API

| 方法 | 路径 |
|------|------|
| GET | `/api/billing/crm/usage/user/{userId}` | 汇总 + 最近 20 条 event |
| PUT | `/api/billing/crm/user/{userId}/subscription` | `{ planId, reason }` |
| POST | `/api/billing/crm/user/{userId}/quota-override` | `{ tokenBonus, runBonus, expiresAt, reason }` |

### 前端

**修改** `frontend/src/pages/admin/UsersPage.tsx` / `UserEditDialog.tsx`：

- Tab「订阅与用量」：当前 plan 下拉、本月 tokens/runs 进度条
- 「临时加配额」表单
- Link「查看明细」→ 侧栏 Drawer 列 usage_event

### 验证

Admin 将用户升 pro → 该用户 `QuotaGate` 立即 1M 配额（Redis plan cache 失效）

---

## T10.3 — 平台成本与收入看板

### API

```
GET /api/billing/crm/usage/overview
→ {
    mrrCents,
    activeSubscriptions: { hobby, pro, enterprise },
    monthTokensTotal,
    monthCostMicros,
    monthRevenueMicros,
    modelBreakdown: [{ model, tokens, costMicros }]
  }

GET /api/billing/crm/usage/trends?days=30
→ 全站 token/cost 日序列
```

### 前端

**新建** `frontend/src/pages/admin/RevenuePage.tsx`（或扩展现有 `StatsPage` Tab）：

- Recharts：MRR、Token 消耗、LLM 成本
- 模型分布饼图
- 对接 Grafana iframe（可选，Phase 8 T8.3）

**AdminSidebar**：

```typescript
{ label: '收入与成本', to: '/admin/revenue', icon: DollarSign },
```

### 验证

数字与 `SELECT sum(cost_micros) FROM usage_event WHERE created_at > date_trunc('month', now())` 一致

---

## T10.4 — 站点 CMS

### API

| 方法 | 路径 | 受众 |
|------|------|------|
| GET | `/api/billing/auth/site-content/{key}` | 公开（Gateway 白名单） |
| GET | `/api/billing/crm/site-content` | Admin 列表 |
| PUT | `/api/billing/crm/site-content/{key}` | Admin 更新 markdown |

**Keys**：`privacy`、`terms`、`contact`、`announcement`

### 前端

**修改** `GenericContentPage.tsx`：

```typescript
const { body_md, title } = await fetchSiteContent(key)
// react-markdown 渲染，无 lorem ipsum
```

**新建** `frontend/src/pages/admin/SiteContentPage.tsx`：

- 左侧 key 列表，右侧 Markdown 编辑器（textarea 即可，V1 不上 WYSIWYG）
- 预览 tab

**Dashboard 公告**：若 `announcement` 非空，`DashboardHeader` 显示 dismissible banner。

### 验证

Admin 改 privacy → `/privacy` 刷新即新内容；无需 redeploy frontend

---

## T10.5 — 审计日志

### 实现

**AOP 或显式调用** `AuditLogService.log(actorId, action, targetType, targetId, before, after)`：

| action | 触发点 |
|--------|--------|
| `plan.create/update/delete` | PlansPage API |
| `user.subscription.change` | 改用户 plan |
| `user.quota.override` | override API |
| `user.role.change` | 现有 CrmUser PUT |
| `site.content.update` | CMS PUT |

### API

```
GET /api/billing/crm/audit-log?page=&action=&actorId=
```

### 前端

**新建** `frontend/src/pages/admin/AuditLogPage.tsx` — 只读表格，支持按 action 过滤。

### 验证

改一次用户 role → audit_log 有 before/after JSON

---

## T10.6 — 系统参数页

### 存储

**V1**：`site_settings` KV 表（或 Nacos 同步）

```sql
CREATE TABLE site_settings (
  setting_key VARCHAR(64) PRIMARY KEY,
  value_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by BIGINT
);
```

**初始 keys**：

| key | 示例值 | 说明 |
|-----|--------|------|
| `registration.enabled` | true | 关闭维护模式 |
| `registration.require_email_verify` | true | |
| `agent.default_model` | deepseek-chat | |
| `agent.max_tokens_per_run` | 4096 | |
| `crawl.max_concurrent_jobs` | 2 | |

### API

`GET/PUT /api/billing/crm/settings`

### 前端

**新建** `frontend/src/pages/admin/SystemSettingsPage.tsx`

**运行时读取**：Gateway 或各服务定时刷新 cache（60s）。

### 验证

关闭 `registration.enabled` → 注册 API 返回 503 + 前端注册页提示

---

## T10.7 — 支付集成

### 分期

| 子阶段 | 范围 |
|--------|------|
| **10.7a** | 手工运营：Admin 改 plan，Billing 页「联系升级」 |
| **10.7b** | Stripe Checkout（国际）或 支付宝当面付（国内） |
| **10.7c** | 订阅 webhook 自动续期 |

### 10.7b 改动要点

**API**：

```
POST /api/billing/auth/checkout { planCode }
→ { checkoutUrl, orderId }

POST /internal/billing/webhook/stripe   # 签名校验
POST /internal/billing/webhook/alipay
```

**Webhook 逻辑**：

- `checkout.session.completed` → UPDATE `user_subscription` plan + period
- INSERT `payment_order` status=paid
- 写 audit_log

**环境变量**（勿提交）：

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
# 或 ALIPAY_*
```

### 前端

Pricing CTA「Upgrade to Pro」→ 调 checkout → redirect

Billing 页「升级」按钮同上

### 验证

Stripe test mode 支付 → 用户 plan=pro，quota 1M

---

## T10.8 — 发票雏形

### API

```
GET /api/billing/auth/invoices
→ [{ period, amountCents, status, downloadUrl }]

GET /api/billing/auth/invoices/{period}/pdf
```

**V1**：服务端 HTML template → flying-saucer / openhtmltopdf 生成 PDF，汇总 `usage_period_summary` + plan 月费。

### 前端

Billing 页「账单历史」Card + 下载按钮

---

## T10.9 — 账户设置页恢复

### 背景

`/dashboard/settings` 当前 `<Navigate to="/dashboard" />`。

### 改动

**恢复** `SettingsPage.tsx` 为完整页或保留 redirect 但扩 **`AccountSettingsPanel`**：

- 当前 plan + 续费日
- 邮箱验证（已有）
- 修改密码（若 API 已有）
- 「管理订阅」→ Billing
- 用量摘要 mini 卡片

**路由**：settings 不再 redirect，渲染 `AccountSettingsPanel` + 订阅区块。

### 验证

`/dashboard/settings` 可访问，展示真实 subscription API 数据

---

## T10.10 — 功能门控（plan_feature）

### 后端

**新建** `FeatureGateService`：

```java
public void assertFeature(long userId, String featureKey) {
    // 读 user plan → plan_feature
    // 缺失 → 403 FEATURE_NOT_AVAILABLE
}
```

**挂钩示例**：

| feature_key | 检查点 |
|-------------|--------|
| `pdf_export` | Content 导出 API |
| `custom_model` | PyAI model 参数非默认时 |
| `crawl_admin` | `/admin/crawler` Gateway + API |

### 前端

非 Pro 用户点 PDF 导出 → 403 toast + 引导 Pricing

### 验证

hobby 用户调 pdf export → 403；升 pro 后成功

---

## Phase 10 完成定义

| 检查项 | 标准 |
|--------|------|
| Admin 菜单 | 套餐、收入成本、站点、审计、系统参数 5 页可用 |
| 站点 | privacy/terms/contact 无占位文案 |
| 审计 | 敏感 Admin 操作 100% 落库 |
| 支付 | 至少 test mode 走通一次（或文档记录手工运营 SOP） |
| 功能门控 | ≥2 个 feature 受 plan 控制 |
| 测试 | 各 Admin 页 ≥1 组件测试；billing CRM API 集成测试 |

---

## Admin 菜单终态

```typescript
const mainNav = [
  { label: '概览', to: '/admin' },
  { label: '用户管理', to: '/admin/users' },
  { label: '套餐管理', to: '/admin/plans' },
  { label: '收入与成本', to: '/admin/revenue' },
  { label: '平台统计', to: '/admin/stats' },
  { label: '站点内容', to: '/admin/site' },
  { label: '系统参数', to: '/admin/system' },
  { label: '审计日志', to: '/admin/audit' },
  { label: 'AI 爬虫', to: '/admin/crawler' },
  { label: '书库', to: '/admin/catalog' },
]
```

---

## 风险与分期建议

| 风险 | 缓解 |
|------|------|
| 支付合规与税务 | V1 仅 digital service；发票咨询当地要求 |
| Admin 功能膨胀 | 各页独立 lazy route，权限细分 `admin` vs `ops` role（后期） |
| 手工改 plan 与 Stripe 双写 | webhook 为 source of truth；Admin 改 plan 写 audit + 可选 cancel Stripe sub |

**若 4 周不够**：优先 T10.1–T10.6（运营闭环），T10.7–T10.8 支付发票可延 Phase 11。

---

## 文件清单

| 操作 | 路径 |
|------|------|
| 新建 | `frontend/src/pages/admin/PlansPage.tsx` |
| 新建 | `frontend/src/pages/admin/RevenuePage.tsx` |
| 新建 | `frontend/src/pages/admin/SiteContentPage.tsx` |
| 新建 | `frontend/src/pages/admin/AuditLogPage.tsx` |
| 新建 | `frontend/src/pages/admin/SystemSettingsPage.tsx` |
| 修改 | `AdminSidebar.tsx`、`UsersPage.tsx`、`GenericContentPage.tsx`、`SettingsPage.tsx` |
| 新建 | Flyway `V5__site_settings_audit.sql` |
| 新建 | `billing/service/AuditLogService.java`、`FeatureGateService.java` |
