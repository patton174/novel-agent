# 模块 2：计费/token 完善 — 设计文档（册 1）

> 范围：审批+CDK 混合升级方案（无真实支付）+ 余额机制 + RPM 限流 + overage 赊账 + 月度续费 job + free 计划 seed。
> 依赖模块3：模型价目表（ai_model 价格 + reporter 算 cost）已交付。
> 本册含 §1 架构 + §2 数据模型 + §3 API；§4–§6 见 [册2](./2026-06-19-billing-design-part2.md)。
> 状态：已通过 brainstorming 全部 6 节确认，待用户复核后转 writing-plans。

## 背景与目标

计费已有骨架：python 每步抽 token→HTTP 上报→Java `usage_event`+月汇总+Redis；运行前配额检查（token+run）；feature gating。模块3 补了模型价目表 + reporter 按 pricing 算 cost + usage_event byok/model_code 列。

缺口：无真实支付/自助升级；RPM 限流未实现（rateLimitRpm 存而不用）；overage 仅 block；无续费 job（current_period_end 永不推进）；**free 计划未 seed（新用户 ensureDefaultSubscription 报错 bug）**。

本模块交付：
1. 审批流（用户申请升级额度/套餐，admin 批/驳）+ CDK 兑换码（充值余额/换套餐/加额度），无真实支付
2. 余额机制（user_balance，CDK 充值 + overage 赊账欠费）
3. RPM 限流（复用 RateLimitService）
4. overage 赊账（block + overage 两策略，overage 超配额扣余额/赊账）
5. 月度续费 job + 赊账结算 job
6. free 计划 seed（修 bug）

## 现状关键事实

- `ProductPlanEntity`：priceCents/monthlyTokenQuota/monthlyRunQuota/rateLimitRpm(默认60)/overagePolicy(默认block)
- V4 seed 仅 hobby/pro/enterprise，**无 free**；`SubscriptionBiz.ensureDefaultSubscription`(:32) 调 `createSubscription("free")` → `requireActivePlanByCode("free")` 抛 `BILLING_PLAN_NOT_FOUND`——新用户首访报错
- `QuotaBiz.checkAndReserveRun`(:28) 读 Redis token/run used vs plan quota，超抛 BILLING_QUOTA_EXCEEDED；**无 RPM、无 overage 分支**
- `rateLimitRpm` 字段存+admin 可编辑，**从不读/执行**；`RateLimitService`(auth, Redis 滑窗 `check(action,identifier,max,window)`) 可复用
- `overagePolicy` 仅 V3 schema + entity 默认 block，**不在 PlanCrmUpsertReq/admin 可编辑、不被 QuotaBiz 读**；QuotaBiz 无条件 block
- 无支付集成（Stripe/支付宝/微信 grep 无）；`UserSubscriptionEntity.externalSubId` 列从未写
- 无自助升级（仅 admin `changeUserPlan`(:70)）；前端 BillingPage 仅展示+链接 /pricing /contact
- 无续费 job（仅 SiteSettingsBiz.refreshCache + RunProxySchedulingConfig 两个 @Scheduled，均非订阅）；`current_period_end` 创建时设一次永不推进
- `UsagePeriodSummaryEntity`：userId/periodYyyyMm/tokensUsed/runsUsed/costMicros/quotaTokens/quotaRuns/updatedAt

## §1 架构总览

```
[用户 BillingPage]              [ novel-studio :8080 ]                    [ python-ai ]
  ├ 余额/用量/配额               BillingController                        usage 上报(模块3)
  ├ 申请升级 ──→ 审批流          ├ user_balance(CDK充值/赊账欠费)
  ├ CDK 兑换 ──→ 充值/换套餐     ├ upgrade_request(用户提,admin批)
  └ 发消息 → QuotaGate            ├ QuotaBiz: 配额+RPM(RateLimitService)+overage(余额扣/赊账)
                                ├ BillingRenewalJob @Scheduled(月度续费+赊账结算)
                                └ free 计划 seed(修 ensureDefaultSubscription bug)
```

### 核心
- **余额机制**：`user_balance`(balanceMicros)。CDK 充值；overage 按模型价从余额扣，余额不足赊账（balance 负）；赊账结算 job 月末汇总
- **审批流**：`upgrade_request`——用户提（目标套餐 or 额度 bonus + 理由），admin 批/驳；批准 → changeUserPlan 或加 user_quota_override
- **CDK 兑换**：`redemption_code`——admin 批量生成（type: balance/plan/quota_bonus，value，有效期，maxUses）；用户兑 → 按类型生效
- **RPM**：`QuotaGateService` 加 `rateLimitService.check("agent_run", userId, rateLimitRpm, 60s)`
- **overage**：`QuotaBiz` 读 overagePolicy——block（现有）/ overage（超用扣余额，不足赊账）
- **续费 job**：`BillingRenewalJob` @Scheduled 月初——推进 current_period_end、过期取消；赊账结算（audit 记录）
- **free seed**：V4 补 free 计划，修新用户报错

## §2 数据模型

### user_balance（余额）
```sql
CREATE TABLE user_balance (
    user_id         BIGINT PRIMARY KEY,
    balance_micros  BIGINT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL
);
```

### redemption_code（CDK 兑换码）
```sql
CREATE TABLE redemption_code (
    id              VARCHAR(36) PRIMARY KEY,
    code            VARCHAR(64) NOT NULL UNIQUE,
    type            VARCHAR(16) NOT NULL,         -- balance | plan | quota_bonus
    value           VARCHAR(120) NOT NULL,        -- balance:微分数; plan:套餐code; quota_bonus:JSON
    max_uses        INTEGER NOT NULL DEFAULT 1,
    used_count      INTEGER NOT NULL DEFAULT 0,
    expires_at      TIMESTAMPTZ,
    created_by      BIGINT,
    created_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_redemption_code_code ON redemption_code (code);
```

### redemption_record（兑换记录，防重+审计）
```sql
CREATE TABLE redemption_record (
    id              BIGSERIAL PRIMARY KEY,
    code_id         VARCHAR(36) NOT NULL,
    user_id         BIGINT NOT NULL,
    redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (code_id, user_id)
);
```

### upgrade_request（审批流）
```sql
CREATE TABLE upgrade_request (
    id              VARCHAR(36) PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    request_type    VARCHAR(16) NOT NULL,         -- plan | quota_bonus
    target_value    VARCHAR(120) NOT NULL,        -- plan:套餐code; quota_bonus:JSON
    reason          TEXT,
    status          VARCHAR(16) NOT NULL DEFAULT 'pending',
    reviewed_by     BIGINT,
    reviewed_at     TIMESTAMPTZ,
    review_note     TEXT,
    created_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_upgrade_request_status ON upgrade_request (status, created_at);
CREATE INDEX idx_upgrade_request_user ON upgrade_request (user_id);
```

### usage_period_summary 扩展
```sql
ALTER TABLE usage_period_summary ADD COLUMN IF NOT EXISTS overage_micros BIGINT NOT NULL DEFAULT 0;
```

### ProductPlanEntity.overagePolicy
现默认 'block'；admin 可编辑（加 PlanCrmUpsertReq）。值：block | overage。

### 实体
`UserBalanceEntity`+Repo、`RedemptionCodeEntity`+`RedemptionRecordEntity`+Repos、`UpgradeRequestEntity`+Repo、`UsagePeriodSummaryEntity` 加 overageMicros。

## §3 API 契约

### 用户端点（/api/billing/auth/*，X-User-Id）
```
GET  /api/billing/auth/balance                → { balanceMicros }
POST /api/billing/auth/redeem                 body: { code }
  → 校验(有效/未过期/未用尽/该用户未兑过) → 按 type 生效：
     balance: balance_micros += value
     plan: changeUserPlan(value)
     quota_bonus: 加 user_quota_override(token/run bonus, 带过期)
  → 写 redemption_record + used_count++ → { type, value, applied }
POST /api/billing/auth/upgrade-request        body: { requestType, targetValue, reason }
GET  /api/billing/auth/upgrade-requests       → 自己的申请列表
```

### 管理员端点（/api/billing/crm/*，admin 门 AuthRoleSupport）
```
POST   /api/billing/crm/redemption-code/generate   body: { type, value, count, maxUses, expiresAt? }
GET    /api/billing/crm/redemption-code/page
DELETE /api/billing/crm/redemption-code/{id}
GET    /api/billing/crm/redemption-record/page
GET    /api/billing/crm/upgrade-request/page?status=
POST   /api/billing/crm/upgrade-request/{id}/approve  body: { reviewNote? }
POST   /api/billing/crm/upgrade-request/{id}/reject   body: { reviewNote }
GET    /api/billing/crm/balance/{userId}
POST   /api/billing/crm/balance/{userId}/adjust      body: { deltaMicros, reason }
```

### RPM（QuotaGate 改，无端点）
`QuotaGateService.assertCanStartRun` 前加 `rateLimitService.check("agent_run", String.valueOf(userId), plan.rateLimitRpm, Duration.ofSeconds(60))`；超限抛 TooManyRequestsException → 429。

### overage（QuotaBiz 改，无端点）
`QuotaBiz.checkAndReserveRun` 读 overagePolicy：block（现有，超抛）/ overage（允许超用，usage 按模型价扣 user_balance，不足赊账 + overage_micros 累计）。

### 续费 job（@Scheduled，无端点）
`BillingRenewalJob` @Scheduled cron `0 0 0 1 * ?`（月初）：
1. 推进 active 订阅 current_period_end 至下月
2. 过期 canceled_at 非空置 inactive
3. 赊账结算：扫上月 overage_micros>0 → audit 记录

### free seed（迁移）
V4 补 free 计划（0 价/1000 token/10 run/rpm 5/block）——修 ensureDefaultSubscription bug。

### 鉴权
- `/api/billing/auth/*`：X-User-Id
- `/api/billing/crm/*`：AuthRoleSupport.requireAdmin

---
§4 overage 计费 + §5 前端 + §6 收尾 见 [册2](./2026-06-19-billing-design-part2.md)。
