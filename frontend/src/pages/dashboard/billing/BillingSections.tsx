import { Link } from 'react-router-dom'
import { Activity, BarChart3, CreditCard, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { APP_BTN_MD } from '@/lib/appButtonTokens'
import { formatCostMicros, formatTokenCount, type UsageCurrent } from '@/api/billingApi'
import { useTranslation } from 'react-i18next'

export interface BillingUsageContentProps {
  usage: UsageCurrent | null
  loading: boolean
  tokenPercent: number
}

/** 用量正文：配额预警 + Token 进度 + Agent 运行次数。桌面 tab / 手机卡共用。 */
export function BillingUsageContent({ usage, loading, tokenPercent }: BillingUsageContentProps) {
  const { t } = useTranslation(['dashboard'])
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    )
  }
  if (!usage) {
    return <p className="text-sm text-muted-foreground">{t('dashboard:billing.noData')}</p>
  }
  return (
    <div className="flex flex-col gap-5">
      {usage.quotaWarning ? (
        <p className="rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
          {t('dashboard:billing.quotaWarning', { percent: usage.percentUsed.toFixed(1) })}
        </p>
      ) : null}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Activity className="size-4 shrink-0" />
            {t('dashboard:billing.monthTokens')}
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatTokenCount(usage.tokensUsed)}
            {usage.tokenQuota != null
              ? ` / ${formatTokenCount(usage.tokenQuota)}`
              : t('dashboard:billing.unlimited')}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500"
            style={{ width: `${tokenPercent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t('dashboard:billing.percentUsed', { percent: usage.percentUsed.toFixed(1) })}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3.5 text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <BarChart3 className="size-4 shrink-0" />
          {t('dashboard:billing.agentRuns')}
        </span>
        <span className="font-semibold tabular-nums text-foreground">
          {usage.runsUsed.toLocaleString('zh-CN')}
          {usage.runQuota != null ? ` / ${usage.runQuota}` : ''}
        </span>
      </div>
    </div>
  )
}

export interface BillingBillContentProps {
  usage: UsageCurrent | null
  loading: boolean
}

/** 账单正文：预估费用 + 套餐徽标 + 升级提示 + 跳转按钮。桌面 tab / 手机卡共用。 */
export function BillingBillContent({ usage, loading }: BillingBillContentProps) {
  const { t } = useTranslation(['dashboard'])
  return (
    <div className="flex flex-col gap-5">
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ) : usage ? (
        <div className="flex items-end justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="size-4 shrink-0" />
              {t('dashboard:billing.estCost')}
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">
              {formatCostMicros(usage.costMicros)}
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {usage.planCode === 'hobby'
              ? t('dashboard:billing.freePlan')
              : t('dashboard:billing.payAsYouGo')}
          </span>
        </div>
      ) : null}

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

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className={`flex-1 ${APP_BTN_MD}`} asChild>
          <Link to="/pricing">
            <Receipt className="mr-2 size-4" />
            {t('dashboard:billing.viewPlans')}
          </Link>
        </Button>
        <Button className={`flex-1 ${APP_BTN_MD}`} variant="outline" asChild>
          <Link to="/contact">{t('dashboard:billing.contactUpgrade')}</Link>
        </Button>
      </div>
    </div>
  )
}
