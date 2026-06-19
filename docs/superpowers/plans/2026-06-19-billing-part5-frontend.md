# Part 5 — 前端实现计划

> 主索引：[2026-06-19-billing.md](./2026-06-19-billing.md) ｜ [Part 4](./2026-06-19-billing-part4-java-controllers.md)
> 设计：[册2 §5](../specs/2026-06-19-billing-design-part2.md)
> 约定：`secureFetch`/`parseResultResponse`；admin 走 cookie JWT + AuthRoleSupport。前端测试 `cd frontend && npx vitest run`；`npx tsc --noEmit`。

---

## Task 16: billingApi + billingAdminApi 扩展

**Files:**
- Modify: `frontend/src/api/billingApi.ts`
- Modify: `frontend/src/api/billingAdminApi.ts`
- Modify: `frontend/src/types/billing.ts`

- [ ] **Step 1: billingApi 加用户函数**

```ts
export async function getBalance(): Promise<{ balanceMicros: number }> {
  const res = await secureFetch('/api/billing/auth/balance')
  if (!res.ok) throw new Error('加载余额失败')
  return parseResultResponse(res)
}

export async function redeemCode(code: string): Promise<{ applied: string }> {
  const res = await secureFetch('/api/billing/auth/redeem', { method: 'POST', body: JSON.stringify({ code }) })
  if (!res.ok) throw new Error('兑换失败')
  return parseResultResponse(res)
}

export async function createUpgradeRequest(req: { requestType: string; targetValue: string; reason?: string }): Promise<{ id: string }> {
  const res = await secureFetch('/api/billing/auth/upgrade-request', { method: 'POST', body: JSON.stringify(req) })
  if (!res.ok) throw new Error('提交申请失败')
  return parseResultResponse(res)
}

export async function fetchMyUpgradeRequests(): Promise<UpgradeRequest[]> {
  const res = await secureFetch('/api/billing/auth/upgrade-requests')
  if (!res.ok) throw new Error('加载申请失败')
  return parseResultResponse(res)
}
```

- [ ] **Step 2: billingAdminApi 加 admin 函数**

```ts
export async function generateRedemptionCodes(payload: {
  type: string; value: string; count: number; maxUses?: number; expiresAt?: string
}): Promise<Array<{ id: string; code: string }>> {
  const res = await secureFetch('/api/billing/crm/redemption-code/generate', { method: 'POST', body: JSON.stringify(payload) })
  if (!res.ok) throw new Error(res.status === 403 ? '无管理权限' : '生成失败')
  return parseResultResponse(res)
}

export async function fetchRedemptionCodes(pageCurrent = 1, pageSize = 20) {
  const res = await secureFetch(`/api/billing/crm/redemption-code/page?pageCurrent=${pageCurrent}&pageSize=${pageSize}`)
  if (!res.ok) throw new Error('加载失败')
  return parseResultResponse(res)
}

export async function deleteRedemptionCode(id: string) {
  const res = await secureFetch(`/api/billing/crm/redemption-code/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('作废失败')
}

export async function fetchUpgradeRequests(status?: string, pageCurrent = 1, pageSize = 20) {
  const s = status ? `&status=${status}` : ''
  const res = await secureFetch(`/api/billing/crm/upgrade-request/page?pageCurrent=${pageCurrent}&pageSize=${pageSize}${s}`)
  if (!res.ok) throw new Error('加载失败')
  return parseResultResponse(res)
}

export async function approveUpgradeRequest(id: string, reviewNote?: string) {
  const res = await secureFetch(`/api/billing/crm/upgrade-request/${id}/approve`, { method: 'POST', body: JSON.stringify({ reviewNote }) })
  if (!res.ok) throw new Error('批准失败')
}

export async function rejectUpgradeRequest(id: string, reviewNote?: string) {
  const res = await secureFetch(`/api/billing/crm/upgrade-request/${id}/reject`, { method: 'POST', body: JSON.stringify({ reviewNote }) })
  if (!res.ok) throw new Error('驳回失败')
}

export async function getAdminBalance(userId: number) {
  const res = await secureFetch(`/api/billing/crm/balance/${userId}`)
  if (!res.ok) throw new Error('加载余额失败')
  return parseResultResponse<{ balanceMicros: number }>(res)
}

export async function adjustAdminBalance(userId: number, deltaMicros: number, reason?: string) {
  const res = await secureFetch(`/api/billing/crm/balance/${userId}/adjust`, { method: 'POST', body: JSON.stringify({ deltaMicros, reason }) })
  if (!res.ok) throw new Error('调整失败')
}

export async function fetchOverage(period: string) {
  const res = await secureFetch(`/api/billing/crm/overage?period=${period}`)
  if (!res.ok) throw new Error('加载赊账失败')
  return parseResultResponse(res)
}
```

- [ ] **Step 3: types/billing.ts 加类型**

```ts
export interface UpgradeRequest {
  id: string
  userId: number
  requestType: string
  targetValue: string
  reason?: string | null
  status: string
  reviewedBy?: number | null
  reviewedAt?: number | null
  reviewNote?: string | null
  createdAt: number
}
```

- [ ] **Step 4: 类型检查 + 提交**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "billingApi|billingAdminApi|billing.ts" || echo "no errors"
git add frontend/src/api/billingApi.ts frontend/src/api/billingAdminApi.ts frontend/src/types/billing.ts
git commit -m "feat(billing): 用户/admin billing API 扩展(余额/兑换/申请/CDK/审批/赊账)"
```

---

## Task 17: BillingPage 改造

**Files:**
- Modify: `frontend/src/pages/dashboard/BillingPage.tsx`

> 加余额区 + CDK 兑换 + 升级申请 + overage 提示 + 429 toast。

- [ ] **Step 1: BillingPage 加余额/兑换/申请区**

在现有 Bill card 后加新卡：
```tsx
        <AppShellCard>
          <AppShellCardHeader title={t('dashboard:billing.walletTitle')} />
          <AppShellCardBody>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{formatCostMicros(balance)}</span>
              <span className={balance < 0 ? 'text-xs text-rose-500' : 'text-xs text-muted-foreground'}>
                {balance < 0 ? t('dashboard:billing.debt') : t('dashboard:billing.balance')}
              </span>
            </div>
            {/* CDK 兑换 */}
            <div className="mt-3 flex gap-2">
              <Input placeholder={t('dashboard:billing.codePlaceholder')} value={code} onChange={(e) => setCode(e.target.value)} />
              <Button onClick={() => void handleRedeem()}>{t('dashboard:billing.redeem')}</Button>
            </div>
            {/* 升级申请 */}
            <Button variant="outline" className="mt-2" onClick={() => setUpgradeOpen(true)}>{t('dashboard:billing.requestUpgrade')}</Button>
            {myRequests.length > 0 ? (
              <div className="mt-2 space-y-1">
                {myRequests.map((r) => (
                  <div key={r.id} className="text-xs">
                    {r.requestType === 'plan' ? r.targetValue : t('dashboard:billing.quotaBonus')} —
                    <span className={r.status === 'approved' ? 'text-emerald-500' : r.status === 'rejected' ? 'text-rose-500' : 'text-amber-500'}>
                      {t(`dashboard:billing.status.${r.status}`)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </AppShellCardBody>
        </AppShellCard>
```
state `balance/code/upgradeOpen/myRequests`。`handleRedeem` 调 `redeemCode` + toast。`UpgradeRequestDialog` 弹窗（选 type: plan 下拉 / quota_bonus 填 token/run + reason）调 `createUpgradeRequest`。

- [ ] **Step 2: 429 toast**

发消息处（useEditorAgentStream）遇 429 toast"请求过频"。或在 fetch 拦截层。

- [ ] **Step 3: 类型检查 + dev 验证 + 提交**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep BillingPage || echo "no errors"
git add frontend/src/pages/dashboard/BillingPage.tsx
git commit -m "feat(billing): BillingPage 余额/兑换/申请/overage 提示"
```

---

## Task 18: PricingPage 改造

**Files:**
- Modify: `frontend/src/pages/PricingPage.tsx`

> CTA 改"申请升级"（跳 /dashboard/billing）+ 兑换码入口，移除 /contact 占位。

- [ ] **Step 1: CTA 改造**

`PricingPage.tsx:137-142` CTA 改：
```tsx
  <Link
    to="/dashboard/billing"
    className={tier.highlight ? MKT_CTA_TIER_HIGHLIGHT : MKT_CTA_OUTLINE}
  >
    {t('pricing:applyUpgrade')}
  </Link>
```
（登录态跳 /dashboard/billing 申请；未登录可仍 /register。加登录判断。）

- [ ] **Step 2: 提交**

```bash
git add frontend/src/pages/PricingPage.tsx
git commit -m "feat(billing): PricingPage CTA 改申请升级"
```

---

## Task 19: AdminBillingPage（4 tab）

**Files:**
- Create: `frontend/src/pages/admin/AdminBillingPage.tsx`
- Modify: `frontend/src/App.tsx`（路由）+ `AdminSidebar.tsx`（导航）+ `AdminLayout.tsx`（PAGE_META）

- [ ] **Step 1: 写 AdminBillingPage（4 tab）**

```tsx
import { useState } from 'react'
import { AppPageIntro, AppPageStack } from '@/components/layout/AppPageStack'
import { Button, Input } from '@/components/ui'
import { appToast } from '@/stores/appToastStore'
import { useTranslation } from 'react-i18next'
import {
  generateRedemptionCodes, fetchRedemptionCodes, deleteRedemptionCode,
  fetchUpgradeRequests, approveUpgradeRequest, rejectUpgradeRequest,
  getAdminBalance, adjustAdminBalance, fetchOverage,
} from '@/api/billingAdminApi'

export default function AdminBillingPage() {
  const { t } = useTranslation(['admin'])
  const [tab, setTab] = useState<'cdk' | 'approve' | 'balance' | 'overage'>('cdk')
  // ... 各 tab state + 渲染（CDK 生成表单+列表/审批列表+批驳/余额查调整/赊账列表）
  return (
    <AppPageStack>
      <AppPageIntro title={t('admin:billing.title')} description={t('admin:billing.desc')} />
      <div className="flex gap-2">
        {(['cdk', 'approve', 'balance', 'overage'] as const).map((tb) => (
          <Button key={tb} variant={tab === tb ? 'default' : 'outline'} size="sm" onClick={() => setTab(tb)}>
            {t(`admin:billing.tab.${tb}`)}
          </Button>
        ))}
      </div>
      {tab === 'cdk' ? <CdkTab /> : null}
      {tab === 'approve' ? <ApproveTab /> : null}
      {tab === 'balance' ? <BalanceTab /> : null}
      {tab === 'overage' ? <OverageTab /> : null}
    </AppPageStack>
  )
}
```
（4 个子组件 CdkTab/ApproveTab/BalanceTab/OverageTab 实现——CDK 生成表单(type/value/count/maxUses)+列表+作废；审批列表 pending 高亮+批/驳带 note；余额按 userId 查+调整；赊账选 period+列表。为控制篇幅，子组件内联或同文件实现。）

- [ ] **Step 2: App.tsx + AdminSidebar + AdminLayout 加路由/导航**

App.tsx admin 路由加 `<Route path="billing" element={<AdminBillingPage />} />`（lazy import）。
AdminSidebar 加 `{ label: t('common:nav.adminBilling'), to: '/admin/billing', icon: Wallet }`。
AdminLayout PAGE_META 加 `'/admin/billing': { title: '计费管理', description: 'CDK/审批/余额/赊账' }`。

- [ ] **Step 3: 类型检查 + dev 验证 + 提交**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep AdminBillingPage || echo "no errors"
git add frontend/src/pages/admin/AdminBillingPage.tsx frontend/src/App.tsx frontend/src/components/admin/AdminSidebar.tsx frontend/src/layouts/AdminLayout.tsx
git commit -m "feat(billing): AdminBillingPage 4 tab(CDK/审批/余额/赊账)"
```

---

## Task 20: i18n + 端到端验证

**Files:**
- Modify: `frontend/src/i18n/locales/zh/{dashboard,admin,common}.json` + `en/{...}`

- [ ] **Step 1: zh 文案**

`dashboard:billing.*` 加：
```json
"walletTitle": "钱包", "balance": "余额", "debt": "欠费",
"codePlaceholder": "输入兑换码", "redeem": "兑换",
"requestUpgrade": "申请升级", "quotaBonus": "额度包",
"status": { "pending": "待审核", "approved": "已批准", "rejected": "已驳回" }
```
`admin:billing.*` 加：
```json
"title": "计费管理", "desc": "CDK/审批/余额/赊账",
"tab": { "cdk": "兑换码", "approve": "审批", "balance": "余额", "overage": "赊账" }
```
`common:nav.adminBilling`: "计费管理"。

- [ ] **Step 2: en 对应英文**

- [ ] **Step 3: 端到端验证**

```bash
cd d:/Users/JZJ/Desktop/agent && powershell -ExecutionPolicy Bypass -File scripts/_restart-dev-stack.ps1
```
1. 新用户注册 → free 计划（修 bug）→ 发消息正常
2. admin /admin/billing CDK tab 生成余额码 → 用户 /dashboard/billing 兑换 → 余额+
3. admin 改某 plan overagePolicy=overage → 用户超配额 → 余额扣/赊账
4. 用户申请升级 → admin 审批 tab 批准 → 套餐变
5. 月初 job（手动触发或等）→ period 推进 + 赊账 audit

- [ ] **Step 4: 全量测试回归 + 提交**

```bash
cd frontend && npx vitest run 2>&1 | tail -8
cd ../novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am test -Dtest=UserBalanceBizTest,RedemptionBizTest,UpgradeRequestBizTest,BillingRpmCheckerTest
git add frontend/src/i18n/locales/
git commit -m "feat(billing): i18n + 端到端验证收尾"
```

---

Part 5 完成。模块 2 全部实现完毕。6 个模块全部完成。

返回 [主索引](./2026-06-19-billing.md)。
