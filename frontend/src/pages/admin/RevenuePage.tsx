import { useTranslation } from 'react-i18next'
import { lazy, Suspense, useEffect, useState } from 'react'
import {
  fetchPlatformUsageOverview,
  fetchPlatformUsageTrends,
  formatCostMicros,
  formatTokenQuota,
  type PlatformUsageOverview,
  type PlatformUsageTrendPoint,
} from '@/api/billingAdminApi'
import { AppPageStack, AppShellCard, AppShellCardBody } from '@/components/layout/AppPageStack'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'

const RevenueCharts = lazy(() => import('./RevenueCharts'))

function StatCard({
  title,
  value,
  hint,
}: {
  title: string
  value: string
  hint?: string
}) {
  return (
    <AppShellCard>
      <AppShellCardBody className="py-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
        {hint ? (
          <p className="mt-2 truncate text-xs text-muted-foreground" title={hint}>
            {hint}
          </p>
        ) : null}
      </AppShellCardBody>
    </AppShellCard>
  )
}

export default function RevenuePage() {
  const { t } = useTranslation(['admin'])
  useMarkRouteSeen()
  const [overview, setOverview] = useState<PlatformUsageOverview | null>(null)
  const [trends, setTrends] = useState<PlatformUsageTrendPoint[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void Promise.all([fetchPlatformUsageOverview(), fetchPlatformUsageTrends(30)])
      .then(([ov, tr]) => {
        if (cancelled) return
        setOverview(ov)
        setTrends(tr)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setOverview(null)
        setTrends([])
        appToast.error(err instanceof Error ? err.message : t('admin:revenue.loadFail'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <AppPageStack>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <AppShellCard key={i}>
              <AppShellCardBody className="py-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-8 w-32" />
              </AppShellCardBody>
            </AppShellCard>
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppPageStack>
    )
  }

  if (!overview || trends === null) {
    return (
      <AppPageStack>
        <p className="py-12 text-center text-sm text-muted-foreground">{t('admin:revenue.empty')}</p>
      </AppPageStack>
    )
  }

  const mrrYuan = overview.mrrCents / 100
  const subsSummary = Object.entries(overview.activeSubscriptions)
    .map(([code, count]) => `${code}: ${count}`)
    .join(' · ')

  return (
    <AppPageStack>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t('admin:revenue.mrr')}
          value={`¥${mrrYuan.toFixed(0)}`}
          hint={subsSummary || t('admin:revenue.noSubs')}
        />
        <StatCard
          title={t('admin:revenue.monthTokens')}
          value={formatTokenQuota(overview.monthTokensTotal)}
        />
        <StatCard
          title={t('admin:revenue.monthCost')}
          value={formatCostMicros(overview.monthCostMicros)}
        />
        <StatCard
          title={t('admin:revenue.monthRevenue')}
          value={formatCostMicros(overview.monthRevenueMicros)}
        />
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        }
      >
        <RevenueCharts trends={trends} modelBreakdown={overview.modelBreakdown} />
      </Suspense>
    </AppPageStack>
  )
}
