# 模块 2：计费/token 完善 — 设计文档（册 2）

> 本册含 §4 overage 计费 + §5 前端 + §6 收尾；§1–§3 见 [册1](./2026-06-19-billing-design.md)。

## §4 overage 计费细节

### 余额扣减时机
`UsageReportBiz.persistReport`（python 上报 usage 时）改造：
- 配额内 usage：不计费（现有行为，仅记 token）
- 超配额 usage（`tokensUsed + thisInput > quota`）：cost 从 `user_balance.balance_micros` 扣；余额不足 → 负（赊账）+ `usage_period_summary.overage_micros` 累计
- 仅 `overagePolicy == 'overage'` 时走扣余额；block 模式不变

判断"超配额"：`persistReport` 时读 Redis 当月 tokensUsed，若 `tokensUsed + thisInput > quota` 则该次 usage 计费扣余额。

### block 模式（现有不变）
配额内放行；超配额 `checkAndReserveRun` 已 block（run 维度）。token 维度 block：`checkAndReserveRun` 现检查 run + token 是否超，超则抛。保持。

### overage 与 RPM/配额关系
- RPM：所有限流（block/overage 都限 RPM）
- run 配额：overage 仅对 token 计费扣余额，**run 仍 block**（run 超不常见，保留 block 防滥用）

### 赊账结算 job
月初 `BillingRenewalJob`：
1. 扫上月 `usage_period_summary` 的 `overage_micros > 0`
2. 复用 `audit_log` 记"用户 X 上月赊账 N 微分"，admin 可见
3. 余额不清零——赊账额保留 balance 负值，用户后续 CDK 充值抵扣；不禁用（overage 信任制）

## §5 前端

### BillingPage.tsx 改造（用户）
- **余额区**：显示 balanceMicros（正绿/负红"欠费"）+ "充值"按钮（跳 CDK 兑换入口）
- **CDK 兑换**：输入框 + "兑换"按钮 → `POST /redeem` → toast 结果（充值成功/换套餐/加额度）
- **升级申请**：按钮 → 弹窗选类型（换套餐:下拉选 plan / 加额度:填 token/run bonus）+ 理由 → `POST /upgrade-request`；下方列自己的申请记录 + 状态徽章
- **overage 提示**：若 plan.overagePolicy=overage 且余额负，显示"已赊账 N，请充值"
- **RPM 429**：发消息遇 429 toast"请求过频，请稍后"

### PricingPage.tsx 改造
- 各套餐 CTA 改"申请升级"（跳 BillingPage 申请）+"兑换码"入口
- 移除"联系客服"占位（改审批流）

### AdminBillingPage（新建，4 tab）
- **CDK 管理 tab**：批量生成（type/value/count/maxUses/expiresAt）+ 列表（used_count）+ 作废
- **审批 tab**：upgrade_request 列表（pending 高亮）+ 批准/驳回（带 reviewNote）
- **余额 tab**：按 userId 查余额 + 手动调整（deltaMicros/reason）
- **赊账 tab**：上月 overage_micros 汇总列表

### API client 扩展（billingApi.ts + billingAdminApi.ts）
```ts
// user
getBalance() / redeem(code) / createUpgradeRequest(req) / listMyUpgradeRequests()
// admin
generateRedemptionCode(payload) / listRedemptionCodes(page) / deleteRedemptionCode(id)
listRedemptionRecords(page) / listUpgradeRequests(status) / approveUpgradeRequest(id,note) / rejectUpgradeRequest(id,note)
getBalance(userId) / adjustBalance(userId, deltaMicros, reason) / listOverage(period)
```

### i18n
`dashboard:billing.*`（余额/兑换/申请/overage）+ `admin:billing.*`（CDK/审批/余额/赊账）。

### 最小可视路径
1. 新用户 → free 计划（修 bug）→ 发消息正常
2. admin 生成 CDK（余额 10000 微分）→ 用户兑换 → 余额+ → 开 overage 套餐 → 超配额扣余额
3. 用户申请升级 pro → admin 审批 → 批准 → 套餐变 pro
4. 月初续费 job → period 推进；赊账用户 audit 可见

## §6 安全 / 测试 / 迁移 / 文件清单 / 边界

### 安全与限制
- **鉴权**：`/api/billing/auth/*` 走 X-User-Id；`/api/billing/crm/*` 走 AuthRoleSupport.requireAdmin
- **CDK 防重**：`redemption_record` UNIQUE(code_id, user_id) 防同用户重复兑；`used_count < max_uses` 防超用；原子更新 `UPDATE ... SET used_count=used_count+1 WHERE used_count<max_uses`
- **余额原子扣减**：`UPDATE user_balance SET balance_micros=balance_micros-:cost WHERE user_id=:uid`（DB 原子，防并发）
- **审批权限**：仅 admin 批/驳；用户只能提自己的申请
- **RPM 公平**：RateLimitService 滑窗按 userId，防单用户刷
- **CDK 码安全**：强随机（32 字符 base62）；不明文存创建者日志

### DB 迁移（V11__billing_upgrade.sql，billing 模块）
- 建 `user_balance` 表
- 建 `redemption_code` + `redemption_record` 表
- 建 `upgrade_request` 表
- `usage_period_summary` 加 `overage_micros` 列
- **seed `free` 计划**：`INSERT INTO product_plan (code,name,...) VALUES ('free','免费',0,1000,10,5,'block',...)`
- `plan_feature` 给 free 加 basic_editor

### 配置项
无新 env；复用 `RateLimitService`（Redis）；@EnableScheduling 已开。

### 测试
- **Java**：
  - `RedemptionBiz.redeem` 各 type 生效 + 防重 + 过期/用尽单测
  - `UpgradeRequestBiz` 批准(plan→changeUserPlan / quota_bonus→override)单测
  - `QuotaBiz` overage 分支（超配额扣余额/赊账）vs block 单测
  - `QuotaGateService` RPM 限流（mock RateLimitService 抛 TooManyRequests）单测
  - `BillingRenewalJob` 推进 period + 赊账 audit 单测
  - `UserBalanceBiz` 原子扣减单测
  - `SubscriptionBiz.ensureDefaultSubscription` free 计划不再抛（集成测）
- **集成**：新用户→free→发消息；CDK 充值→overage 扣余额；申请→审批→换套餐；月初 job

### 关键文件清单

**Java（novel-studio）**
- `studio-module-billing`：
  - `entity/{UserBalanceEntity,RedemptionCodeEntity,RedemptionRecordEntity,UpgradeRequestEntity}` + Repos
  - `UsagePeriodSummaryEntity` 加 overageMicros
  - `service/biz/{RedemptionBiz,UpgradeRequestBiz,UserBalanceBiz,BillingRenewalJob}`
  - `service/biz/QuotaBiz` 改（overage 分支）
  - `service/biz/UsageReportBiz` 改（overage 扣余额）
  - `controller/auth/BillingAuthController`(余额/兑换/申请) + `controller/crm/BillingCrmController` 扩展(CDK/审批/余额)
  - `PlanCrmUpsertReq` 加 overagePolicy
  - 迁移 `V11__billing_upgrade.sql`
- `studio-module-agent`：`QuotaGateService` 注入 RateLimitService + RPM check

**前端**
- `src/pages/dashboard/BillingPage.tsx` 改造
- `src/pages/PricingPage.tsx` 改造
- `src/pages/admin/AdminBillingPage.tsx`（新建，4 tab）
- `src/api/billingApi.ts` + `billingAdminApi.ts` 扩展
- `src/types/billing.ts` 扩展
- i18n `dashboard:billing.*` + `admin:billing.*`

### 范围边界（YAGNI，本模块不做）
- ❌ 真实支付集成（支付宝/微信/Stripe）——CDK+审批混合方案
- ❌ 自动续费扣款（无支付，续费 job 仅推进 period）
- ❌ 发票/税务
- ❌ 退款流程
- ❌ 按模型维度成本看板（模块3 已留 byok/model_code 列，统计看板后续）
- ❌ 余额负值禁用服务（overage 信任制，不禁用）
- ❌ RPM 按工具维度细分（仅全局 agent_run RPM）

### 风险与备注
- **free 计划 bug 修复**：现 `ensureDefaultSubscription` 对新用户抛 BILLING_PLAN_NOT_FOUND——本模块 seed free 后修复；已有 hobby 用户不受影响
- **余额负值**：overage 允许 balance 负（赊账），依赖用户后续 CDK 充值抵扣；不主动禁用，admin 可监控 overage_micros
- **CDK 码泄漏**：码明文存 DB（便于 admin 查/分发）；生成强随机；admin 作废即失效
- **RPM 与配额**：RPM 限流在配额检查前（RateLimitService.check 先于 QuotaBiz），429 优先于配额超
- **续费 job 时区**：cron `0 0 0 1 * ?` 按 server 时区月初；period 推进用 `current_period_end.plus(month)` 与 YYYY-MM key 一致
- **赊账结算**：无支付下仅 audit 记录 + admin 可见；未来接支付后转"待支付订单"
- **模块3 依赖**：overage 扣余额依赖模块3 的模型价目表（ai_model 价格 + reporter 算 cost）已实现
