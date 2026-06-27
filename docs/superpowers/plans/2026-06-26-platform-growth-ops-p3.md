# P3 — 分销归因与定时任务热重载

**Goal:** Referral 全链路 + Job cron 可配置 + Redis 热重载。

**前置：** P0-c（job run history）、P1-b（affCode checkout）

**索引：** [2026-06-26-platform-growth-ops-index.md](./2026-06-26-platform-growth-ops-index.md)

---

## Task 1: Referral 数据与注册归因

**Files:**
- Create: `studio-module-billing/.../db/migration/V{n}__referral.sql`
- Create: `entity/ReferralCodeEntity.java`, `ReferralAttributionEntity.java`
- Create: `service/biz/ReferralBiz.java`, `ReferralCrmBiz.java`
- Modify: `studio-module-auth` — 注册读 cookie/header `na-ref`
- Create: `frontend/src/pages/admin/ReferralStatsPage.tsx`
- Create: `frontend/src/pages/dashboard/ReferralPanel.tsx` — 用户自己的链接

- [ ] 每用户一码或申请制（spec：自动生成）
- [ ] 注册写 attribution；支付 webhook 更新 first_paid_order_id
- [ ] CRM 报表：top referrers, conversion rate
- [ ] i18n + 测试

---

## Task 2: Job 配置表 + 热重载

**Files:**
- Create: `studio-platform-scheduling/.../ScheduledJobConfigEntity.java`（或 worker 模块 JPA）
- Create: `.../db/migration/V{n}__scheduled_job_config.sql`
- Create: `ScheduledJobConfigService.java`
- Modify: `StudioJobRegistrar.java` — 读 DB 覆盖 delay/cron；监听 Redis channel `studio:jobs:reload`
- Modify: `WorkerCrmJobsController.java` — PUT config, POST reload
- Modify: `SystemJobsPage.tsx` — cron 编辑 Dialog

**配置模型：**
- `schedule_type`: `fixed_delay` | `cron`
- `cron_expression`: Spring 6-field
- `enabled`: false 时不注册

- [ ] 保存 config → publish reload
- [ ] 所有实例收到 reload → cancel futures → re-register
- [ ] 集成测试：改 interval 后 job 频率变化（slow test, optional）
- [ ] 迁移遗留 `@Scheduled` 到 `StudioScheduledJob`（可选子任务）

---

## Task 3: 遗留 Job 统一

| 当前 | 目标 jobId |
|------|------------|
| `IDataRiverConfigService` @Scheduled 30s | `payment-idatariver-config-refresh` |
| `SiteSettingsBiz` @Scheduled 60s | `site-settings-cache-refresh` |
| `RunProxySchedulingConfig` 15s | `agent-run-proxy-heartbeat` |

- [ ] 实现三个 `StudioScheduledJob` adapter
- [ ] 删除类内 `@Scheduled` 或 delegate
- [ ] `systemJobsCatalog.ts` i18n 完整

---

## P3 验收

- 用户分享链接 → 新用户注册 → CRM 见 attribution
- 首单支付 → attribution 有 order_id
- Admin 改 job cron → 无需重启 JVM，日志见 re-register
- 禁用 job → 不再触发
