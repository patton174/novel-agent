import { useState, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Activity, BarChart3, CreditCard, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { APP_BTN_MD } from '@/lib/appButtonTokens'
import { formatCostMicros, formatTokenCount, type UsageCurrent, type UsageTrendPoint } from '@/api/billingApi'
import { PlanRecommendDialog } from '@/components/billing/PlanRecommendDialog'
import { BillingCostTrendChart } from '@/components/billing/BillingCostTrendChart'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'

export interface BillingUsageContentProps {
  usage: UsageCurrent | null
  loading: boolean
  tokenPercent: number
}

function UsageMetricCard({
  label,
  icon: Icon,
  children,
  className,
}: {
  label: string
  icon: ComponentType<{ className?: string }>
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`flex flex-col gap-4 rounded-xl border-2 border-black bg-surface p-5 shadow-soft ${className ?? ''}`}
    >
      <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-primary">
        <Icon className="size-4 shrink-0" />
        {label}
      </div>
      {children}
    </section>
  )
}

/** 用量正文：套餐摘要 + Token 进度 + Agent 运行次数。桌面 tab / 手机卡共用。 */
export function BillingUsageContent({ usage, loading, tokenPercent }: BillingUsageContentProps) {
  const { t } = useTranslation(['dashboard'])
  const dateLocale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-28 rounded-xl md:col-span-2" />
        <Skeleton className="h-40 rounded-xl md:col-span-2" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    )
  }
  if (!usage) {
    return null
  }
  return (
    <div className="flex flex-col gap-4">
      {usage.quotaWarning ? (
        <p className="rounded-lg border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
          {t('dashboard:billing.quotaWarning', { percent: usage.percentUsed.toFixed(1) })}
        </p>
      ) : null}

      <div className="rounded-xl border-2 border-black bg-surface px-5 py-4 shadow-soft">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
          {t('dashboard:billing.currentPlan')}
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-black tracking-tight text-foreground">{usage.planName}</p>
            <p className="mt-0.5 font-mono text-sm text-muted-foreground">{usage.periodYyyyMm}</p>
          </div>
          <span className="rounded-full border border-black/20 bg-muted/50 px-3 py-1 text-xs font-medium text-foreground">
            {usage.planCode === 'hobby'
              ? t('dashboard:billing.freePlan')
              : t('dashboard:billing.payAsYouGo')}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <UsageMetricCard
          label={t('dashboard:billing.monthTokens')}
          icon={Activity}
          className="md:col-span-2"
        >
          <div className="flex items-end justify-between gap-4">
            <p className="text-3xl font-black tabular-nums tracking-tight text-foreground">
              {formatTokenCount(usage.tokensUsed)}
            </p>
            <p className="text-sm font-medium tabular-nums text-muted-foreground">
              {usage.tokenQuota != null
                ? `/ ${formatTokenCount(usage.tokenQuota)}`
                : t('dashboard:billing.unlimited')}
            </p>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 transition-[width]"
              style={{ width: `${tokenPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t('dashboard:billing.percentUsed', { percent: usage.percentUsed.toFixed(1) })}
          </p>
        </UsageMetricCard>

        <UsageMetricCard label={t('dashboard:billing.agentRuns')} icon={BarChart3}>
          <p className="text-3xl font-black tabular-nums tracking-tight text-foreground">
            {usage.runsUsed.toLocaleString(dateLocale)}
            {usage.runQuota != null ? (
              <span className="ml-2 text-lg font-semibold text-muted-foreground">
                / {usage.runQuota.toLocaleString(dateLocale)}
              </span>
            ) : null}
          </p>
        </UsageMetricCard>
      </div>
    </div>
  )
}

export interface BillingBillContentProps {
  usage: UsageCurrent | null
  loading: boolean
  payReturnChecking?: boolean
  costTrends?: UsageTrendPoint[]
  /** 账单页：去掉升级长文与重复的「查看套餐」按钮 */
  billsPage?: boolean
  /** 外层已有 AppShellCard 时去掉内层黑边卡片 */
  embedded?: boolean
}

/** 账单正文：预估费用 + 套餐徽标 + 升级提示 + 跳转按钮。桌面 tab / 手机卡共用。 */
export function BillingBillContent({
  usage,
  loading,
  payReturnChecking = false,
  costTrends = [],
  billsPage = false,
  embedded = false,
}: BillingBillContentProps) {
  const { t } = useTranslation(['dashboard'])
  const [recommendOpen, setRecommendOpen] = useState(false)
  const showUpgrade = usage?.planCode === 'hobby' || usage?.quotaWarning

  return (
    <div className="flex flex-col gap-5">
      {payReturnChecking ? (
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-primary">
          {t('dashboard:billing.payReturnChecking')}
        </p>
      ) : null}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-16 w-full rounded-lg" />
          {billsPage && embedded ? <Skeleton className="h-[200px] w-full rounded-lg" /> : null}
          {!billsPage ? <Skeleton className="h-10 w-full rounded-xl" /> : null}
        </div>
      ) : usage ? (
        embedded ? (
          <div className="flex flex-col gap-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-primary">
                  <CreditCard className="size-4 shrink-0" />
                  {t('dashboard:billing.estCost')}
                </p>
                <p className="mt-3 text-4xl font-black tabular-nums tracking-tight text-foreground">
                  {formatCostMicros(usage.costMicros)}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-black/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {usage.planCode === 'hobby'
                  ? t('dashboard:billing.freePlan')
                  : t('dashboard:billing.payAsYouGo')}
              </span>
            </div>
            <BillingCostTrendChart points={costTrends} loading={loading} />
          </div>
        ) : (
        <div className="rounded-xl border-2 border-black bg-surface p-5 shadow-soft">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-primary">
                <CreditCard className="size-4 shrink-0" />
                {t('dashboard:billing.estCost')}
              </p>
              <p className="mt-3 text-4xl font-black tabular-nums tracking-tight text-foreground">
                {formatCostMicros(usage.costMicros)}
              </p>
            </div>
            <span className="rounded-full border border-black/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {usage.planCode === 'hobby'
                ? t('dashboard:billing.freePlan')
                : t('dashboard:billing.payAsYouGo')}
            </span>
          </div>
        </div>
        )
      ) : null}

      {!billsPage ? (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          {t('dashboard:billing.upgradeHint1')}
          <Link to="/pricing" className="mx-1 font-medium text-primary hover:underline">
            {t('dashboard:billing.pricingPage')}
          </Link>
          {t('dashboard:billing.upgradeHint2')}
          <Link to="/contact" className="mx-1 font-medium text-primary hover:underline">
            {t('dashboard:billing.contactUs')}
          </Link>
          {t('dashboard:billing.upgradeHint3')}
        </p>
      ) : null}

      {!billsPage ? (
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className={`flex-1 ${APP_BTN_MD}`} asChild>
          <Link to="/pricing">
            <Receipt className="mr-2 size-4" />
            {t('dashboard:billing.viewPlans')}
          </Link>
        </Button>
        {showUpgrade ? (
          <Button
            className={`flex-1 ${APP_BTN_MD}`}
            variant="outline"
            onClick={() => setRecommendOpen(true)}
          >
            {t('dashboard:billing.payNow')}
          </Button>
        ) : (
          <Button className={`flex-1 ${APP_BTN_MD}`} variant="outline" asChild>
            <Link to="/contact">{t('dashboard:billing.contactUpgrade')}</Link>
          </Button>
        )}
      </div>
      ) : showUpgrade ? (
        <Button className={APP_BTN_MD} variant="outline" onClick={() => setRecommendOpen(true)}>
          {t('dashboard:billing.payNow')}
        </Button>
      ) : null}

      <PlanRecommendDialog
        open={recommendOpen}
        onOpenChange={setRecommendOpen}
        recommendPlanCode="pro"
        reason={usage?.quotaWarning ? 'quota' : 'upgrade'}
      />
    </div>
  )
}
