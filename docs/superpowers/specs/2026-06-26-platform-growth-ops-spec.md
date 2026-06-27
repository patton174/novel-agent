# 平台增长与运营模块 — 设计规格

> **版本**：2026-06-26  
> **状态**：待评审  
> **配套计划**：`docs/superpowers/plans/2026-06-26-platform-growth-ops-index.md`  
> **架构基线**：novel-studio 单体 + python-ai + frontend（见 `CLAUDE.md`）

---

## 1. 背景与目标

全站 i18n 与计费/checkout 基础已具备。下一阶段补齐 **用户增长（邀请/分销/赠送）**、**站内触达（消息中心）**、**运维可观测（定时任务治理 + 主机健康）**、**前端品牌体验（动态标题/图标）**。

### 1.1 成功标准

| 模块 | KPI |
|------|-----|
| 站内消息 | 用户可查看未读/已读；系统/营销/交易类消息可模板化；Admin 可群发 |
| 邀请码 | 注册可填码；码有次数/过期；CRM 可查 redemption |
| 分销 | checkout 传 `affCode`；首单归因；CRM 可查 referrer 统计 |
| 赠送 | Admin 可发配额/套餐/兑换码；用户可兑换；全链路审计 |
| 标题/图标 | 每路由 + locale + 主题下 tab 标题正确；favicon 随主题切换 |
| 定时任务 | 所有 `StudioScheduledJob` 可手动触发；cron/间隔可配置；变更有热重载 |
| 健康检查 | Admin 可见 CPU/内存/磁盘 + 各服务探活；历史曲线（可选 P1） |

### 1.2 非目标（本阶段不做）

- 移动端 Push（APNs/FCM）
- 邮件营销自动化（仅复用现有 Mailtrap 验证信）
- 多级分销佣金结算打款（仅记录 attribution + 报表）
- Kubernetes 级 HPA / 自动扩缩容

---

## 2. 现状盘点（2026-06）

| 能力 | 已有 | 缺口 |
|------|------|------|
| 消息 | Toast、Modal、站点公告 CMS、公开弹幕 | 用户收件箱、未读数、定向消息 |
| 邀请/分销 | checkout `affCode=""` 占位 | 码生成、注册归因、iDR 对接 |
| 优惠券 | Admin iDataRiver coupon CRUD | 用户 checkout 输入 coupon |
| 赠送 | `user_quota_override` CRM | 统一 gift 模型、用户兑换 API |
| 定时任务 | `StudioScheduledJob`×3 + Redis 锁 + `SystemJobsPage` 只读 | 手动执行、cron 配置、热重载、执行历史 |
| 监控 | Actuator health + 前端 probe 页 | CPU/内存/磁盘、python-ai/中间件聚合 |
| 标题/图标 | 静态 `index.html` | 路由/locale/主题联动 |

---

## 3. 模块架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│  frontend                                                        │
│  · MessageCenter (bell) · useDocumentMeta · checkout coupon/aff  │
│  · Admin: Jobs CRUD · Monitoring charts · Invite/Referral/Gift   │
└────────────────────────────┬────────────────────────────────────┘
                             │ secureFetch
┌────────────────────────────▼────────────────────────────────────┐
│  novel-studio (单体)                                              │
│  studio-module-notification  ← 站内消息（新）                      │
│  studio-module-auth          ← 邀请码、注册归因                     │
│  studio-module-billing       ← 分销、赠送、checkout coupon/aff    │
│  studio-module-worker        ← 任务调度 CRM、监控聚合 API          │
│  studio-platform-scheduling  ← JobRegistry 热重载、cron 引擎       │
└────────────────────────────┬────────────────────────────────────┘
                             │
         PostgreSQL / Redis / RabbitMQ / Actuator / OSHI
```

**模块归属原则**（与 `project-architecture.mdc` 一致）：

- 与用户身份强绑定 → `studio-module-auth`
- 与计费/订单/配额 → `studio-module-billing`
- 与运维/调度/探活 → `studio-module-worker` + `studio-platform-scheduling`
- 纯 UI → `frontend/`

---

## 4. M1 — 站内消息模块（Notification）

### 4.1 需求

| 类型 | 说明 | 示例 |
|------|------|------|
| `system` | 平台通知 | 维护公告、功能上线 |
| `billing` | 交易/订阅 | 支付成功、即将到期 |
| `agent` | 创作相关 | 长任务完成、索引重建完成 |
| `marketing` | 运营 | 活动、优惠 |
| `admin_broadcast` | Admin 群发 | 全员/分群（P1：仅全员） |

### 4.2 数据模型

**表 `user_notification`**（`studio-module-notification`，Flyway `V1__notification.sql`）

| 列 | 类型 | 说明 |
|----|------|------|
| id | BIGSERIAL PK | |
| user_id | BIGINT NOT NULL | 收件人 |
| category | VARCHAR(32) | system/billing/agent/marketing |
| title_key | VARCHAR(128) | i18n key（优先） |
| body_key | VARCHAR(128) | 可选 |
| title_text | TEXT | 兜底明文（Admin 群发） |
| body_text | TEXT | |
| payload_json | JSONB | 深链、订单号等 |
| read_at | TIMESTAMPTZ | NULL=未读 |
| created_at | TIMESTAMPTZ | |

索引：`(user_id, created_at DESC)`，`(user_id) WHERE read_at IS NULL`（未读计数）

**表 `notification_template`**（可选 P1，首版可用 properties + 代码发信）

### 4.3 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/notification/auth/inbox` | 分页列表 `?cursor=&limit=` |
| GET | `/api/notification/auth/unread-count` | 未读数（Header 轮询或 WebSocket P2） |
| POST | `/api/notification/auth/{id}/read` | 标记已读 |
| POST | `/api/notification/auth/read-all` | 全部已读 |
| POST | `/api/notification/crm/broadcast` | Admin 群发 |
| POST | `/internal/notification/send` | 模块间：billing/agent 发单条 |

**i18n**：`title_key`/`body_key` 走 `messages_*.properties`（`notification.billing.payment_success` 等）；`ResultLocalizer` 在 API 层按 locale 解析后返回 `title`/`body` 字段。

### 4.4 前端

| 组件 | 路径 |
|------|------|
| `NotificationBell` | `frontend/src/components/notification/NotificationBell.tsx` |
| `NotificationDrawer` | 侧栏列表 + 未读 badge |
| `dashboard` / `editor` 顶栏挂载 | 复用 `AppShellToolbar` |

**与现有能力关系**：

- 站点公告 `DashboardAnnouncementBanner` 保留（广播 CMS）
- Toast 保留（瞬时反馈）
- 长任务完成 → 除 Toast 外写入 inbox（可选配置）

### 4.5 发送方集成

| 发送方 | 触发点 |
|--------|--------|
| `PaymentOrderSyncService.markPaid` | billing 消息 |
| `SubscriptionBiz` 到期提醒 | 定时任务 + billing 消息 |
| `UploadService` 解析完成 | agent 类消息 |
| Admin CRM | broadcast |

---

## 5. M2 — 邀请码、分销、赠送

### 5.1 邀请码（Invite）

**归属**：`studio-module-auth`

**表 `invite_code`**

| 列 | 说明 |
|----|------|
| code | VARCHAR(32) UNIQUE，如 `NA-INV-XXXX` |
| created_by | Admin userId |
| max_uses | INT，0=无限 |
| used_count | INT |
| expires_at | TIMESTAMPTZ |
| reward_type | none / quota_bonus / plan_trial |
| reward_payload | JSONB |
| status | active / disabled |

**表 `invite_redemption`**：`invite_code_id`, `user_id`, `redeemed_at`

**流程**：

1. Admin CRM 创建码
2. 注册页可选填 `inviteCode` → `RegisterRequest` 扩展字段
3. 校验 → 创建用户 → 写 redemption → 若 `reward_type` 非 none，调 `InviteRewardApplier`（billing 实现）

**API**：

- `GET/POST /api/auth/crm/invite-codes`
- 注册：`POST /api/auth/register` 增字段

### 5.2 分销（Referral / Distribution）

**归属**：`studio-module-billing`（订单归因）+ `studio-module-auth`（注册 cookie）

**表 `referral_code`**：`user_id`, `code` UNIQUE, `status`

**表 `referral_attribution`**：`referrer_user_id`, `referred_user_id`, `first_touch_at`, `registered_at`, `first_paid_order_id`

**流程**：

1. 用户申请/自动生成 referral link：`?ref=CODE`
2. 落地页 `useReferralCapture` 写 cookie `na-ref`（30 天）
3. 注册时 auth 读 cookie 写 attribution
4. Checkout：`PayCheckoutReq.affCode` → `IDataRiverPaymentBiz` 填入 `orderInfo.affCode`（**已有占位，需接线**）
5. Webhook 支付成功 → 更新 `first_paid_order_id`

**CRM**：`/api/billing/crm/referrals` 统计 referrer 邀请数、付费数

### 5.3 赠送（Gift）

**统一模型**（billing），覆盖现有 `user_quota_override` 场景：

**表 `gift_campaign`**：Admin 创建的赠送活动（名称、类型、库存、过期）

**表 `gift_redemption`**：`campaign_id`, `user_id`, `code`, `status`, `fulfilled_at`

| gift_type | 履约 |
|-----------|------|
| `quota_bonus` | `UsageCrmBiz.addQuotaOverride` |
| `plan_trial` | `SubscriptionBiz.changeUserPlan` |
| `idr_coupon` | 生成/绑定 iDR coupon 码 |
| `license_key` | `IdrCdkGenerator` 批量 |

**用户 API**：

- `POST /api/billing/auth/gift/redeem` `{ code }`
- Admin：`/api/billing/crm/gift-campaigns` CRUD + 批量生成码

**Checkout 优惠券**（与赠送区分）：

- `PayCheckoutReq` 增加 `couponCode`
- `IDataRiverPaymentBiz`：`orderInfo.put("coupon", couponCode)`
- 前端 `PayCheckoutPanel` 增加优惠码输入框

### 5.4 安全与审计

- 所有 CRM 变更 → `AuditLogService`
- CRM 端点统一 `AuthRoleSupport.requireAdmin`
- 兑换接口限流（防暴力猜码）：`RateLimitService` 扩展

---

## 6. M3 — 网页标题与图标（Document Meta）

### 6.1 需求

- `document.title` = `{pageTitle} · {appName}`，随路由、locale 变化
- `html[lang]` 随 locale：`zh-CN` / `en`
- favicon 随 **解析后** 主题（light/dark/system）切换
- 编辑器可按章节名覆盖 title（可选）

### 6.2 实现要点

| 项 | 方案 |
|----|------|
| 路由元数据 | `frontend/src/config/routeDocumentMeta.ts` 统一 map |
| Hook | `useDocumentMeta()` 挂于 `AppRoutes` |
| 资源 | `public/novel-icon.svg` + `novel-icon-dark.svg` |
| i18n | 复用 `common:layout.*`、`marketing:*`、`auth:*` |
| 站点品牌（P1） | `site_settings` 或 `site_content` 增加 `brand.shortName` |

**不改**：不引入 react-helmet（除非后续要 OG meta）

---

## 7. M4 — 定时任务管理（Scheduling Ops）

### 7.1 现状与目标

**已有**：

- `StudioScheduledJob` 接口 + `StudioJobRegistrar` + Redis 分布式锁
- `WorkerCrmJobsController` 只读 overview
- `BatchJobDispatcher` + MQ 批处理

**目标**：

| 能力 | 说明 |
|------|------|
| 自动注册 | 新 `StudioScheduledJob` Bean 启动时进入 `StudioJobCatalog`（已有） |
| 可配置调度 | DB/Redis 存 `cron` 或 `fixed_delay_ms`，覆盖接口默认值 |
| 手动执行 | Admin `POST /api/worker/crm/jobs/{jobId}/run` |
| 热重载 | 配置变更 → Redis pub/sub `studio:jobs:reload` → 取消旧 future、按新 cron 重注册 |
| 执行历史 | 每 job 最近 N 次：开始/结束/耗时/错误 |

### 7.2 数据模型

**表 `scheduled_job_config`**

| 列 | 说明 |
|----|------|
| job_id | PK，对应 `StudioScheduledJob.jobId()` |
| enabled | BOOLEAN |
| schedule_type | fixed_delay / cron |
| fixed_delay_ms | |
| cron_expression | Quartz 6 字段 |
| initial_delay_ms | |
| updated_by | |
| updated_at | |

**表 `scheduled_job_run`**：job_id, started_at, finished_at, status, error_message, instance_id

### 7.3 平台改造

```
studio-platform-scheduling/
├── StudioJobRegistrar        # 读 ScheduledJobConfigRepository，支持 reload()
├── ScheduledJobConfigService # CRUD + publish reload event
├── JobManualRunner           # 手动触发（仍走 Redis 锁）
└── CronJobAdapter            # Spring CronTrigger 与 fixedDelay 统一
```

**遗留 `@Scheduled`**（`IDataRiverConfigService` 等）：

- Phase 2 迁移为 `StudioScheduledJob` 或注册到 legacy catalog（只读展示已有）

### 7.4 前端

扩展 `SystemJobsPage`：

- 每 job：启用开关、cron 编辑、上次运行、手动 Run 按钮
- 执行历史表格
- i18n：补 `site-content-translation` 等条目到 `systemJobsCatalog.ts`

---

## 8. M5 — 服务健康与主机负载

### 8.1 需求

Admin 监控页展示：

| 维度 | 指标 |
|------|------|
| 服务探活 | novel-studio、python-ai、frontend（浏览器）、PostgreSQL、Redis、RabbitMQ |
| JVM | heap used/max、threads、uptime |
| 主机 | CPU%、内存%、磁盘%（Worker 节点） |

### 8.2 技术选型

| 组件 | 选型 | 说明 |
|------|------|------|
| JVM 指标 | Spring Boot Actuator `metrics` + Micrometer | 已启用 prometheus |
| 主机指标 | **[OSHI](https://github.com/oshi/oshi)** | 跨平台 CPU/内存/磁盘，纯 Java |
| 聚合 API | `studio-module-worker` | `GET /api/worker/crm/monitoring/snapshot` |
| 前端 | 扩展 `SystemMonitoringPage` | 卡片 + 简易折线（复用 Pro charts） |

**不落库首版**：snapshot 实时拉取；P1 可写 Redis 时序（60s TTL）供 sparkline。

### 8.3 探活矩阵

| Target | 方式 |
|--------|------|
| novel-studio | `/actuator/health` |
| python-ai | `http://python-ai:8000/api/health`（worker 内网） |
| PostgreSQL | `SELECT 1` via Hikari |
| Redis | `PING` |
| RabbitMQ | `RabbitTemplate` execute |

**禁止**：浏览器直连 python-ai（CORS/安全）；由 novel-studio 代理或 worker 聚合。

### 8.4 告警（P1）

- 阈值配置：`monitoring.alert.cpu_percent > 90`
- 通知：写入 `notification` 模块 → Admin 角色用户

---

## 9. 横切关注点

### 9.1 i18n

- 所有新 API 错误：`ValidationException.keyed` + `messages_*.properties`
- 前端：`notification.json`（新 namespace）或扩 `dashboard`/`admin`
- 消息内容：优先 key + 参数，Admin 群发允许明文 + `localeResolved` 降级（复用 site_content 模式）

### 9.2 安全

- CRM 全部 `requireAdmin`
- 用户 API JWT + 仅访问本人 inbox
- `internal/*` 仅 `X-Internal-Service-Key`
- 邀请/礼品码：防枚举、限流、审计

### 9.3 Flyway

| 模块 | 迁移 |
|------|------|
| notification | `V1__notification.sql` |
| auth | `V{n}__invite_referral.sql` |
| billing | `V{n}__referral_gift_checkout.sql` |
| worker | `V{n}__scheduled_job_ops.sql` |

### 9.4 依赖

```xml
<!-- studio-module-worker 或 studio-platform-scheduling -->
<dependency>
  <groupId>com.github.oshi</groupId>
  <artifactId>oshi-core</artifactId>
  <version>6.6.5</version>
</dependency>
```

---

## 10. 分期建议

| 阶段 | 模块 | 周期（估） | 用户可见 |
|------|------|-----------|----------|
| **P0** | Document Meta + 监控 snapshot + Job 手动执行 | 1 周 | 标题/图标；Admin 监控增强 |
| **P1** | 站内消息 MVP + checkout coupon/aff | 2 周 | 消息铃铛；结账优惠码 |
| **P2** | 邀请码 + 赠送兑换 | 2 周 | 注册邀请；礼品码 |
| **P3** | 分销归因 + Job 热重载/cron 配置 | 2 周 | 推荐链接；任务可配置 |
| **P4** | 告警、消息模板、分群群发 | 1 周+ | 运维告警 |

详见：`docs/superpowers/plans/2026-06-26-platform-growth-ops-index.md`

---

## 11. 风险与决策点

| 决策 | 选项 | 建议 |
|------|------|------|
| 消息存储上限 | 每用户保留 N 条 vs 永久 | 90 天 TTL + 分页 |
| 分销结算 | 仅报表 vs 自动分成 | 首版仅 attribution + iDR affCode |
| Job cron 引擎 | Spring `@Scheduled` cron vs Quartz | Spring `CronTrigger` 足够 |
| 监控历史 | 仅实时 vs Prometheus | 首版 OSHI snapshot；Prometheus 已有 actuator 暴露 |

---

## 12. 附录：关键文件索引

| 主题 | 路径 |
|------|------|
| 调度框架 | `novel-studio/studio-platform/studio-platform-scheduling/` |
| 任务 Admin | `frontend/src/pages/admin/SystemJobsPage.tsx` |
| 监控 | `frontend/src/pages/admin/SystemMonitoringPage.tsx` |
| Checkout | `IDataRiverPaymentBiz.java`, `PayCheckoutPanel.tsx` |
| 配额赠送 | `UsageCrmBiz.java` |
| 主题/语言 | `themeStore.ts`, `i18n/index.ts` |
| 运营历史规格 | `docs/superpowers/specs/2026-06-08-platform-operations-design.md` |
