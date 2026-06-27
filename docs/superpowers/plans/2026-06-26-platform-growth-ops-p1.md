# P1 — 站内消息与结账增强

> **For agentic workers:** REQUIRED SUB-SKILL: subagent-driven-development.

**Goal:** 用户消息收件箱 + Admin 群发；checkout 接入 coupon/affCode。

**Architecture:** 新建 `studio-module-notification`；billing 扩展 `PayCheckoutReq`；internal HTTP 发消息。

**索引：** [2026-06-26-platform-growth-ops-index.md](./2026-06-26-platform-growth-ops-index.md)

---

## Task 1: 创建 studio-module-notification

**Files:**
- Create: `novel-studio/studio-modules/studio-module-notification/pom.xml`
- Create: `.../NotificationApplication` 包结构（随单体扫描，无独立 main）
- Modify: `novel-studio/studio-modules/pom.xml` — module 列表
- Modify: `novel-studio/studio-app/pom.xml` — dependency

- [ ] **Step 1:** 复制 `studio-module-upload` 的 pom 模板（kernel + platform-web + platform-i18n）
- [ ] **Step 2:** 确保 `studio-app` 引入模块

---

## Task 2: Flyway + Entity

**Files:**
- Create: `.../resources/db/migration/V1__notification.sql`
- Create: `entity/UserNotificationEntity.java`, `UserNotificationId` 如需要
- Create: `repository/UserNotificationRepository.java`

- [ ] **Step 1:** 建表 `user_notification`（见 spec §4.2）
- [ ] **Step 2:** JPA entity + 索引对齐
- [ ] **Step 3:** Repository：`findByUserIdOrderByCreatedAtDesc`, `countByUserIdAndReadAtIsNull`

---

## Task 3: NotificationBiz + API

**Files:**
- Create: `service/biz/NotificationBiz.java`
- Create: `service/biz/NotificationCrmBiz.java`
- Create: `controller/auth/NotificationAuthController.java`
- Create: `controller/crm/NotificationCrmController.java`
- Create: `controller/internal/InternalNotificationController.java`
- Create: `dto/*Resp.java`, `BroadcastReq.java`, `SendNotificationReq.java`

**Paths:**
- `GET /api/notification/auth/inbox`
- `GET /api/notification/auth/unread-count`
- `POST /api/notification/auth/{id}/read`
- `POST /api/notification/auth/read-all`
- `POST /api/notification/crm/broadcast`
- `POST /internal/notification/send`

- [ ] **Step 1:** `NotificationBiz.listInbox` — 解析 title_key/body_key via `StudioMessages`
- [ ] **Step 2:** `markRead` / `markAllRead` — 校验 userId 归属
- [ ] **Step 3:** `InternalNotificationController` — `ClientAuthSupport.isTrustedService`
- [ ] **Step 4:** CRM broadcast — title/body 明文 + audit
- [ ] **Step 5:** i18n keys `notification.*` in messages_zh_CN / en
- [ ] **Step 6:** `NotificationBizTest` — inbox, unread, keyed resolution

---

## Task 4: 发送方集成（billing）

**Files:**
- Modify: `.../billing/service/PaymentOrderSyncService.java`（或 markPaid 路径）
- Create: `.../billing/client/NotificationClient.java` — HTTP internal send

- [ ] **Step 1:** 支付成功 → send `notification.billing.payment_success` with orderId payload
- [ ] **Step 2:** 可选：订阅即将到期（若已有 cron，否则 P4）

---

## Task 5: Frontend 消息中心

**Files:**
- Create: `frontend/src/api/notificationApi.ts`
- Create: `frontend/src/components/notification/NotificationBell.tsx`
- Create: `frontend/src/components/notification/NotificationDrawer.tsx`
- Modify: `frontend/src/components/layout/AppShellToolbar.tsx`
- Create: `frontend/src/i18n/locales/{zh,en}/notification.json`
- Modify: `frontend/src/i18n/index.ts` — 注册 namespace

- [ ] **Step 1:** API client + types
- [ ] **Step 2:** Bell + badge（轮询 unread 60s 或 focus 刷新）
- [ ] **Step 3:** Drawer 列表 + 标记已读
- [ ] **Step 4:** i18n 空态、分类标签
- [ ] **Step 5:** Admin 页 `NotificationBroadcastPage.tsx`（可选放 `/admin/notification`）

---

## Task 6: Checkout coupon + affCode

**Files:**
- Modify: `.../billing/dto/PayCheckoutReq.java` — `couponCode`, `affCode` optional
- Modify: `.../billing/service/biz/IDataRiverPaymentBiz.java` — 填入 orderInfo
- Modify: `frontend/src/components/billing/PayCheckoutPanel.tsx`
- Modify: `frontend/src/components/billing/usePayCheckout.ts`
- Modify: `frontend/src/i18n/locales/{zh,en}/marketing.json` — checkout.couponLabel 等
- Create: `frontend/src/hooks/useReferralCapture.ts` — cookie `na-ref`

- [ ] **Step 1:** Backend DTO + 接线（替换硬编码 `""`）
- [ ] **Step 2:** 前端优惠码输入 + 提交 checkout
- [ ] **Step 3:** 落地页 `?ref=` capture → cookie → checkout 自动带 affCode
- [ ] **Step 4:** 测试：`IDataRiverPaymentBizTest` mock orderInfo 含 coupon/aff

---

## P1 验收

- 用户支付成功 → inbox 有一条 billing 消息
- Admin broadcast → 全员收到
- `/checkout?plan=pro` 输入优惠码 → 请求体含 coupon
- 访问 `/?ref=TEST` 后 checkout → affCode 非空
