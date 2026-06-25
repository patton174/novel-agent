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
import {
  AdminDataPage,
  AdminDataPanel,
  AdminDataPanelBody,
  AdminDataPanelHeader,
  AdminStatStrip,
} from '@/components/layout/AdminDataLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'

const RevenueCharts = lazy(() => import('./RevenueCharts'))

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
  }, [t])

  if (loading) {
    return (
      <AdminDataPage>
        <AdminStatStrip loading items={[{ label: '…', value: '—' }]} />
        <Skeleton className="h-72 w-full rounded-xl" />
      </AdminDataPage>
    )
  }

  if (!overview || trends === null) {
    return (
      <AdminDataPage>
        <p className="py-10 text-center text-sm text-muted-foreground">{t('admin:revenue.empty')}</p>
      </AdminDataPage>
    )
  }

  const mrrYuan = overview.mrrCents / 100
  const subsSummary = Object.entries(overview.activeSubscriptions)
    .map(([code, count]) => `${code}: ${count}`)
    .join(' · ')

  return (
    <AdminDataPage>
      <AdminStatStrip
        items={[
          {
            label: t('admin:revenue.mrr'),
            value: `¥${mrrYuan.toFixed(0)}`,
            emphasis: true,
          },
          { label: t('admin:revenue.monthTokens'), value: formatTokenQuota(overview.monthTokensTotal) },
          { label: t('admin:revenue.monthCost'), value: formatCostMicros(overview.monthCostMicros) },
          { label: t('admin:revenue.monthRevenue'), value: formatCostMicros(overview.monthRevenueMicros) },
          {
            label: t('admin:revenue.activeSubs'),
            value: subsSummary || t('admin:revenue.noSubs'),
          },
        ]}
      />

      <AdminDataPanel>
        <AdminDataPanelHeader title={t('admin:revenue.chartTitle')} description={t('admin:revenue.chartDesc')} />
        <AdminDataPanelBody className="space-y-6">
          <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
            <RevenueCharts trends={trends} modelBreakdown={overview.modelBreakdown ?? []} />
          </Suspense>
        </AdminDataPanelBody>
      </AdminDataPanel>
    </AdminDataPage>
  )
}
