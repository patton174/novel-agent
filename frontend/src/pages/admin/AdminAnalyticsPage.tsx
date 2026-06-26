import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import {
  fetchContentStats,
  fetchPlatformStats,
  fetchStatsTrends,
  type ContentStats,
  type PlatformStats,
  type TrendPoint,
} from '@/api/adminApi'
import {
  fetchPlatformUsageOverview,
  fetchPlatformUsageTrends,
  formatCostMicros,
  formatTokenQuota,
  type PlatformUsageOverview,
  type PlatformUsageTrendPoint,
} from '@/api/billingAdminApi'
import { AdminField, AdminSelect, AdminTabList, AdminTabTrigger } from '@/components/admin/AdminFormControls'
import {
  AdminDataPage,
  AdminDataPanel,
  AdminDataPanelBody,
  AdminDataPanelHeader,
  AdminStatStrip,
} from '@/components/layout/AdminDataLayout'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import { Skeleton } from '@/components/ui/skeleton'

const StatsOverviewCharts = lazy(() => import('./StatsOverviewCharts'))
const StatsTrendCharts = lazy(() => import('./StatsTrendCharts'))
const RevenueCharts = lazy(() => import('./RevenueCharts'))

const chartFallback = (
  <div className="grid gap-4 lg:grid-cols-2" aria-hidden>
    <Skeleton className="h-56 rounded-lg" />
    <Skeleton className="h-56 rounded-lg" />
    <Skeleton className="h-56 rounded-lg" />
    <Skeleton className="h-56 rounded-lg" />
  </div>
)

type AnalyticsTab = 'platform' | 'revenue' | 'content'

function sumTrend(points: TrendPoint[]): number {
  return points.reduce((acc, p) => acc + p.count, 0)
}

function sumUsageTokens(points: PlatformUsageTrendPoint[]): number {
  return points.reduce((acc, p) => acc + p.tokens, 0)
}

function sumUsageCost(points: PlatformUsageTrendPoint[]): number {
  return points.reduce((acc, p) => acc + p.costMicros, 0)
}

export default function AdminAnalyticsPage() {
  const { t } = useTranslation(['admin'])
  useMarkRouteSeen()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as AnalyticsTab | null) ?? 'platform'

  const [days, setDays] = useState(30)
  const [platform, setPlatform] = useState<PlatformStats | null>(null)
  const [content, setContent] = useState<ContentStats | null>(null)
  const [overview, setOverview] = useState<PlatformUsageOverview | null>(null)
  const [agentRunTrend, setAgentRunTrend] = useState<TrendPoint[] | null>(null)
  const [registrationTrend, setRegistrationTrend] = useState<TrendPoint[] | null>(null)
  const [usageTrend, setUsageTrend] = useState<PlatformUsageTrendPoint[] | null>(null)
  const [loading, setLoading] = useState(true)

  const RANGE_OPTIONS = [
    { days: 7, label: t('admin:stats.last7Days') },
    { days: 30, label: t('admin:stats.last30Days') },
    { days: 90, label: t('admin:stats.last90Days') },
  ] as const

  const rangeLabel = RANGE_OPTIONS.find((o) => o.days === days)?.label ?? t('admin:stats.lastDays', { days })

  const load = useCallback(async (rangeDays: number) => {
    setLoading(true)
    try {
      const [platformStats, contentStats, trends, billingTrends, billingOverview] = await Promise.all([
        fetchPlatformStats(),
        fetchContentStats(),
        fetchStatsTrends(rangeDays),
        fetchPlatformUsageTrends(rangeDays).catch(() => [] as PlatformUsageTrendPoint[]),
        fetchPlatformUsageOverview().catch(() => null),
      ])
      setPlatform(platformStats)
      setContent(contentStats)
      setAgentRunTrend(trends.agentRunTrend)
      setRegistrationTrend(trends.registrationTrend)
      setUsageTrend(billingTrends)
      setOverview(billingOverview)
    } catch (err: unknown) {
      appToast.error(err instanceof Error ? err.message : t('admin:stats.loadFail'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load(days)
  }, [days, load])

  const periodRegistrations = useMemo(() => sumTrend(registrationTrend ?? []), [registrationTrend])
  const periodAgentRuns = useMemo(() => sumTrend(agentRunTrend ?? []), [agentRunTrend])
  const periodTokens = useMemo(() => sumUsageTokens(usageTrend ?? []), [usageTrend])
  const periodCost = useMemo(() => sumUsageCost(usageTrend ?? []), [usageTrend])

  const setTab = (next: AnalyticsTab) => {
    setSearchParams({ tab: next }, { replace: true })
  }

  const platformStats = [
    { label: t('admin:home.totalUsers'), value: platform?.totalUsers.toLocaleString('zh-CN') ?? '—' },
    { label: t('admin:stats.periodRegistrations', { range: rangeLabel }), value: periodRegistrations.toLocaleString('zh-CN') },
    { label: t('admin:stats.periodAgentRuns', { range: rangeLabel }), value: periodAgentRuns.toLocaleString('zh-CN') },
    { label: t('admin:home.activeUsers'), value: platform?.activeUsers.toLocaleString('zh-CN') ?? '—' },
  ]

  const revenueStats = overview
    ? [
        { label: t('admin:revenue.mrr'), value: `¥${(overview.mrrCents / 100).toFixed(0)}`, emphasis: true as const },
        { label: t('admin:revenue.monthTokens'), value: formatTokenQuota(overview.monthTokensTotal) },
        { label: t('admin:revenue.monthCost'), value: formatCostMicros(overview.monthCostMicros) },
        { label: t('admin:stats.periodTokens', { range: rangeLabel }), value: formatTokenQuota(periodTokens) },
        { label: t('admin:stats.periodCost', { range: rangeLabel }), value: formatCostMicros(periodCost) },
      ]
    : [{ label: t('admin:revenue.mrr'), value: '—' }]

  const contentStats = [
    { label: t('admin:home.totalNovels'), value: content?.totalNovels.toLocaleString('zh-CN') ?? '—' },
    { label: t('admin:home.totalChapters'), value: content?.totalChapters.toLocaleString('zh-CN') ?? '—' },
    { label: t('admin:home.totalAgentRuns'), value: content?.totalAgentRuns.toLocaleString('zh-CN') ?? '—' },
    { label: t('admin:stats.periodAgentRuns', { range: rangeLabel }), value: periodAgentRuns.toLocaleString('zh-CN') },
  ]

  const statItems = tab === 'revenue' ? revenueStats : tab === 'content' ? contentStats : platformStats

  return (
    <AdminDataPage>
      <AdminStatStrip loading={loading} items={statItems} />

      <AdminDataPanel>
        <AdminDataPanelHeader
          title={t('admin:analytics.title')}
          description={t('admin:analytics.desc')}
          action={
            <AdminField label={t('admin:stats.dateRange')} className="min-w-[10rem] sm:max-w-none">
              <AdminSelect
                value={days}
                aria-label={t('admin:stats.dateRange')}
                className="sm:w-40"
                onChange={(e) => setDays(Number(e.target.value))}
              >
                {RANGE_OPTIONS.map((opt) => (
                  <option key={opt.days} value={opt.days}>
                    {opt.label}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
          }
        />
        <AdminDataPanelBody className="space-y-4 py-3">
          <AdminTabList>
            <AdminTabTrigger active={tab === 'platform'} onClick={() => setTab('platform')}>
              {t('admin:analytics.tabPlatform')}
            </AdminTabTrigger>
            <AdminTabTrigger active={tab === 'revenue'} onClick={() => setTab('revenue')}>
              {t('admin:analytics.tabRevenue')}
            </AdminTabTrigger>
            <AdminTabTrigger active={tab === 'content'} onClick={() => setTab('content')}>
              {t('admin:analytics.tabContent')}
            </AdminTabTrigger>
          </AdminTabList>

          {loading || agentRunTrend === null ? (
            chartFallback
          ) : (
            <Suspense fallback={chartFallback}>
              {tab === 'platform' ? (
                <StatsOverviewCharts
                  agentRunTrend={agentRunTrend}
                  registrationTrend={registrationTrend ?? []}
                  usageTrend={usageTrend ?? []}
                  rangeLabel={rangeLabel}
                />
              ) : tab === 'revenue' ? (
                <RevenueCharts trends={usageTrend ?? []} modelBreakdown={overview?.modelBreakdown ?? []} />
              ) : (
                <StatsTrendCharts
                  agentRunTrend={agentRunTrend}
                  registrationTrend={registrationTrend ?? []}
                  rangeLabel={rangeLabel}
                />
              )}
            </Suspense>
          )}
        </AdminDataPanelBody>
      </AdminDataPanel>
    </AdminDataPage>
  )
}
