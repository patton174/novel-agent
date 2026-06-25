import { useTranslation } from 'react-i18next'
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchContentStats,
  fetchPlatformStats,
  fetchStatsTrends,
  type ContentStats,
  type PlatformStats,
  type TrendPoint,
} from '@/api/adminApi'
import {
  fetchPlatformUsageTrends,
  formatCostMicros,
  formatTokenQuota,
  type PlatformUsageTrendPoint,
} from '@/api/billingAdminApi'
import { AdminField, AdminSelect } from '@/components/admin/AdminFormControls'
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

const chartAreaFallback = (
  <div className="space-y-6" aria-hidden>
    <Skeleton className="h-72 rounded-2xl" />
    <Skeleton className="h-72 rounded-2xl" />
    <Skeleton className="h-72 rounded-2xl" />
    <Skeleton className="h-72 rounded-2xl" />
  </div>
)

function sumTrend(points: TrendPoint[]): number {
  return points.reduce((acc, p) => acc + p.count, 0)
}

function sumUsageTokens(points: PlatformUsageTrendPoint[]): number {
  return points.reduce((acc, p) => acc + p.tokens, 0)
}

function sumUsageCost(points: PlatformUsageTrendPoint[]): number {
  return points.reduce((acc, p) => acc + p.costMicros, 0)
}

export default function StatsPage() {
  const { t } = useTranslation(['admin'])
  useMarkRouteSeen()
  const [days, setDays] = useState(30)
  const [platform, setPlatform] = useState<PlatformStats | null>(null)
  const [content, setContent] = useState<ContentStats | null>(null)
  const [agentRunTrend, setAgentRunTrend] = useState<TrendPoint[] | null>(null)
  const [registrationTrend, setRegistrationTrend] = useState<TrendPoint[] | null>(null)
  const [usageTrend, setUsageTrend] = useState<PlatformUsageTrendPoint[] | null>(null)
  const [loading, setLoading] = useState(true)

  const loadTrends = useCallback(async (rangeDays: number) => {
    setLoading(true)
    try {
      const [platformStats, contentStats, data, billingTrends] = await Promise.all([
        fetchPlatformStats(),
        fetchContentStats(),
        fetchStatsTrends(rangeDays),
        fetchPlatformUsageTrends(rangeDays).catch(() => [] as PlatformUsageTrendPoint[]),
      ])
      setPlatform(platformStats)
      setContent(contentStats)
      setAgentRunTrend(data.agentRunTrend)
      setRegistrationTrend(data.registrationTrend)
      setUsageTrend(billingTrends)
    } catch (err: unknown) {
      setPlatform({ totalUsers: 0, todayRegistrations: 0, activeUsers: 0 })
      setContent({ totalNovels: 0, totalChapters: 0, totalAgentRuns: 0 })
      setAgentRunTrend([])
      setRegistrationTrend([])
      setUsageTrend([])
      appToast.error(err instanceof Error ? err.message : t('admin:stats.loadFail'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadTrends(days)
  }, [days, loadTrends])

  const RANGE_OPTIONS = [
    { days: 7, label: t('admin:stats.last7Days') },
    { days: 30, label: t('admin:stats.last30Days') },
    { days: 90, label: t('admin:stats.last90Days') },
  ] as const

  const rangeLabel = RANGE_OPTIONS.find((o) => o.days === days)?.label ?? t('admin:stats.lastDays', { days })

  const periodRegistrations = useMemo(
    () => sumTrend(registrationTrend ?? []),
    [registrationTrend],
  )
  const periodAgentRuns = useMemo(() => sumTrend(agentRunTrend ?? []), [agentRunTrend])
  const periodTokens = useMemo(() => sumUsageTokens(usageTrend ?? []), [usageTrend])
  const periodCost = useMemo(() => sumUsageCost(usageTrend ?? []), [usageTrend])

  const summaryLoading = loading || platform === null || content === null

  return (
    <AdminDataPage>
      <AdminStatStrip
        loading={summaryLoading}
        items={[
          { label: t('admin:home.totalUsers'), value: platform?.totalUsers.toLocaleString('zh-CN') ?? '—' },
          {
            label: t('admin:stats.periodRegistrations', { range: rangeLabel }),
            value: periodRegistrations.toLocaleString('zh-CN'),
          },
          {
            label: t('admin:stats.periodAgentRuns', { range: rangeLabel }),
            value: periodAgentRuns.toLocaleString('zh-CN'),
          },
          { label: t('admin:home.activeUsers'), value: platform?.activeUsers.toLocaleString('zh-CN') ?? '—' },
          { label: t('admin:stats.periodTokens', { range: rangeLabel }), value: formatTokenQuota(periodTokens) },
          { label: t('admin:stats.periodCost', { range: rangeLabel }), value: formatCostMicros(periodCost) },
          { label: t('admin:home.totalNovels'), value: content?.totalNovels.toLocaleString('zh-CN') ?? '—' },
          {
            label: t('admin:home.totalAgentRuns'),
            value: content?.totalAgentRuns.toLocaleString('zh-CN') ?? '—',
          },
        ]}
      />

      <AdminDataPanel>
        <AdminDataPanelHeader
          title={t('admin:stats.title')}
          description={t('admin:stats.descExtended')}
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
        <AdminDataPanelBody className="py-3">
          {loading || agentRunTrend === null ? (
            chartAreaFallback
          ) : (
            <Suspense fallback={chartAreaFallback}>
              <StatsOverviewCharts
                agentRunTrend={agentRunTrend}
                registrationTrend={registrationTrend ?? []}
                usageTrend={usageTrend ?? []}
                rangeLabel={rangeLabel}
              />
            </Suspense>
          )}
        </AdminDataPanelBody>
      </AdminDataPanel>
    </AdminDataPage>
  )
}
