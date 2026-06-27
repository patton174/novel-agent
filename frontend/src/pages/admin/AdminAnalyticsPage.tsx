import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'
import i18n from '@/i18n'
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
import { AdminField, AdminSelect } from '@/components/admin/AdminFormControls'
import {
  AdminDataPage,
  AdminDataPanel,
  AdminDataPanelBody,
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

type AnalyticsSection = 'platform' | 'revenue' | 'content'

const SECTIONS: AnalyticsSection[] = ['platform', 'revenue', 'content']

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
  const { section: sectionParam } = useParams<{ section: string }>()
  const section = SECTIONS.includes(sectionParam as AnalyticsSection)
    ? (sectionParam as AnalyticsSection)
    : null

  if (!section) {
    return <Navigate to="/admin/analytics/platform" replace />
  }

  return <AdminAnalyticsSectionPage section={section} />
}

function AdminAnalyticsSectionPage({ section }: { section: AnalyticsSection }) {
  const { t } = useTranslation(['admin'])
  const dateLocale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'
  useMarkRouteSeen()

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

  const platformStats = [
    { label: t('admin:home.totalUsers'), value: platform?.totalUsers.toLocaleString(dateLocale) ?? '—' },
    { label: t('admin:stats.periodRegistrations', { range: rangeLabel }), value: periodRegistrations.toLocaleString(dateLocale) },
    { label: t('admin:stats.periodAgentRuns', { range: rangeLabel }), value: periodAgentRuns.toLocaleString(dateLocale) },
    { label: t('admin:home.activeUsers'), value: platform?.activeUsers.toLocaleString(dateLocale) ?? '—' },
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
    { label: t('admin:home.totalNovels'), value: content?.totalNovels.toLocaleString(dateLocale) ?? '—' },
    { label: t('admin:home.totalChapters'), value: content?.totalChapters.toLocaleString(dateLocale) ?? '—' },
    { label: t('admin:home.totalAgentRuns'), value: content?.totalAgentRuns.toLocaleString(dateLocale) ?? '—' },
    { label: t('admin:stats.periodAgentRuns', { range: rangeLabel }), value: periodAgentRuns.toLocaleString(dateLocale) },
  ]

  const statItems = section === 'revenue' ? revenueStats : section === 'content' ? contentStats : platformStats

  return (
    <AdminDataPage>
      <AdminStatStrip loading={loading} items={statItems} />

      <AdminDataPanel>
        <AdminDataPanelBody className="py-3">
          <div className="mb-4 flex justify-end">
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
          </div>
          {loading || agentRunTrend === null ? (
            chartFallback
          ) : (
            <Suspense fallback={chartFallback}>
              {section === 'platform' ? (
                <StatsOverviewCharts
                  agentRunTrend={agentRunTrend}
                  registrationTrend={registrationTrend ?? []}
                  usageTrend={usageTrend ?? []}
                  rangeLabel={rangeLabel}
                />
              ) : section === 'revenue' ? (
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
