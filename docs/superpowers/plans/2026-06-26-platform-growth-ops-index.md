# 平台增长与运营模块 — 实施索引

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 交付站内消息、邀请/分销/赠送、动态标题图标、定时任务运维、主机健康监控五大能力。

**Architecture:** 新模块 `studio-module-notification`；auth/billing 扩展增长表；worker + scheduling 扩展任务治理与 OSHI 监控；frontend 统一 `useDocumentMeta` + Admin CRM 页。

**Tech Stack:** novel-studio 单体、Flyway、Redis 锁、OSHI 6.x、Micrometer/Actuator、React + i18next。

**设计规格：** [`docs/superpowers/specs/2026-06-26-platform-growth-ops-spec.md`](../specs/2026-06-26-platform-growth-ops-spec.md)

---

## 阶段与依赖

```
P0 基础体验 + 运维可见性（无新表或轻表）
 ├─ P0-a Document Meta（标题/图标/locale）
 ├─ P0-b 监控 Snapshot（OSHI + 探活聚合）
 └─ P0-c 定时任务手动执行 + 运行历史

P1 触达 + 结账增强（依赖 P0 可选）
 ├─ P1-a 站内消息 MVP（新 module + PG）
 └─ P1-b Checkout coupon/affCode 接线

P2 增长 — 邀请与赠送
 ├─ P2-a 邀请码（auth）
 └─ P2-b 赠送活动 + 用户兑换（billing）

P3 增长 — 分销 + 任务热重载
 ├─ P3-a Referral 归因 + CRM 报表
 └─ P3-b Job cron 配置 + Redis 热重载

P4  polish（可选）
 ├─ 监控告警 → notification
 ├─ 消息模板 / 分群
 └─ 遗留 @Scheduled 迁移
```

| 阶段 | 计划文档 | 估时 | 前置 |
|------|----------|------|------|
| **P0** | [P0 基础](./2026-06-26-platform-growth-ops-p0.md) | ~1 周 | 无 |
| **P1** | [P1 消息与结账](./2026-06-26-platform-growth-ops-p1.md) | ~2 周 | P0 可并行 |
| **P2** | [P2 邀请与赠送](./2026-06-26-platform-growth-ops-p2.md) | ~2 周 | P1-b 可选 |
| **P3** | [P3 分销与调度](./2026-06-26-platform-growth-ops-p3.md) | ~2 周 | P0-c |
| **P4** | spec §10 扩展 | ~1 周 | P1+P3 |

---

## 模块与仓库路径

| 模块 | 新建/扩展 | Maven 路径 |
|------|-----------|------------|
| notification | **新建** | `novel-studio/studio-modules/studio-module-notification/` |
| auth | 扩展 | `studio-module-auth/` — invite |
| billing | 扩展 | `studio-module-billing/` — referral, gift, checkout |
| worker | 扩展 | `studio-module-worker/` — jobs CRM, monitoring |
| scheduling | 扩展 | `studio-platform-scheduling/` — reload, cron |
| frontend | 扩展 | `frontend/src/` — meta, inbox, admin |

**单体注册：** `studio-app/pom.xml` 增加 `studio-module-notification` 依赖；`NovelStudioApplication` 扫描包无需改（同根包）。

---

## 验收清单（全阶段）

### 用户侧
- [x] 英文/中文切换后浏览器 tab 标题正确
- [x] 暗色模式下 favicon 切换
- [x] 消息铃铛显示未读数；可标记已读
- [x] Checkout 可输入优惠码；推荐链接 `?ref=` 归因

### Admin 侧
- [x] `/admin/system/jobs` 可手动 Run；见执行历史
- [x] `/admin/system/monitoring` 见 CPU/内存/磁盘 + 服务状态
- [x] 邀请码 / 赠送活动 CRM CRUD
- [x] 分销统计页（邀请数、付费数）

### 技术
- [x] 新表 Flyway 迁移；`hibernate.ddl-auto=validate` 通过
- [x] CRM 接口 `AuthRoleSupport.requireAdmin`
- [x] i18n keys zh/en 齐全
- [x] CI：`mvn test` billing/auth/worker/notification；`npm test` 相关 frontend

---

## Remaining (P4)

- [x] Monitoring alerts → notification (`MonitoringAlertJob`)
- [x] Notification retention (`NotificationRetentionJob`)
- [x] Subscription expiring notify (`SubscriptionExpiringNotificationJob`)
- [x] Invite reward fulfillment (`BillingInviteRewardClient`)

## 并行实施建议

可同时开工（文件域隔离）：

| 轨道 A | 轨道 B | 轨道 C |
|--------|--------|--------|
| P0-a frontend meta | P0-b worker monitoring | P0-c scheduling manual run |
| P1-a notification module | P1-b checkout coupon UI+API | — |
| P2-a auth invite | P2-b billing gift | — |

**合并顺序：** P0 → P1 → P2 → P3；每阶段独立可部署验收。

---

## 相关历史文档

- 运营总规格（部分过时微服务描述）：`docs/superpowers/specs/2026-06-08-platform-operations-design.md`
- Phase 10 Admin：`docs/superpowers/plans/2026-06-08-phase10-admin-operations.md`
- 计费/iDataRiver：`docs/superpowers/specs/2026-06-19-billing-design.md`
