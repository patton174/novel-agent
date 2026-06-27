# P2 — 邀请码与赠送

**Goal:** Admin 管理邀请码；注册可选填码；赠送活动与用户兑换。

**索引：** [2026-06-26-platform-growth-ops-index.md](./2026-06-26-platform-growth-ops-index.md)

---

## Task 1: 邀请码（auth）

**Files:**
- Create: `studio-module-auth/.../db/migration/V{n}__invite_code.sql`
- Create: `entity/InviteCodeEntity.java`, `InviteRedemptionEntity.java`
- Create: `repository/*`, `service/biz/InviteCrmBiz.java`, `InviteCodeService.java`
- Create: `controller/crm/InviteCrmController.java`
- Modify: `dto/RegisterRequest.java`, `AuthService` / `AuthPublicBiz`
- Create: `frontend/src/pages/admin/InviteCodesPage.tsx`, `api/inviteAdminApi.ts`

- [ ] Flyway：`invite_code`, `invite_redemption`
- [ ] CRM CRUD + 禁用码
- [ ] 注册校验：过期/次数/状态
- [ ] `InviteRewardApplier` 接口在 billing 实现（quota/plan_trial）
- [ ] 前端注册页 `inviteCode` 字段 + Admin 列表
- [ ] i18n `auth.invite.*`, `admin.invite.*`
- [ ] `InviteCodeServiceTest`

---

## Task 2: 赠送活动（billing）

**Files:**
- Create: `.../db/migration/V{n}__gift_campaign.sql`
- Create: `entity/GiftCampaignEntity.java`, `GiftRedemptionEntity.java`
- Create: `service/biz/GiftCampaignCrmBiz.java`, `GiftRedeemBiz.java`
- Create: `controller/crm/GiftCrmController.java`
- Create: `controller/auth/GiftAuthController.java` — `POST /api/billing/auth/gift/redeem`
- Modify: `UsageCrmBiz` — 从 GiftRedeem 调用而非仅 CRM 直调

- [ ] 类型：`quota_bonus` | `plan_trial` | `license_key`（iDR CDK）
- [ ] Admin 批量生成码（CSV 导出 optional）
- [ ] 用户兑换 + 限流
- [ ] 审计 `gift.redeem`, `gift.campaign.create`
- [ ] 前端：Admin Gift 页 + Dashboard「兑换礼品码」卡片（Settings 或 Billing）
- [ ] `GiftRedeemBizTest`

---

## P2 验收

- 创建邀请码 max_uses=1 → 第二次注册失败
- 创建 quota 赠送码 → 用户 redeem 后 usage 增加
- audit_log 有 invite/gift 记录
