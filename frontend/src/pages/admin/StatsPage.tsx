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
import { AdminNativeSelect } from '@/components/layout/AdminNativeSelect'
import { AppPageStack, AppShellCard, AppShellCardBody, AppShellCardHeader, AppStatCard } from '@/components/layout/AppPageStack'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import { Skeleton } from '@/components/ui/skeleton'
import { Bot, BookOpen, UserCheck, UserPlus, Users, Zap } from 'lucide-react'

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
    <AppPageStack className="gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AppStatCard
          label={t('admin:home.totalUsers')}
          icon={Users}
          iconClassName="text-blue-600"
          iconBgClassName="bg-blue-500/10"
          loading={summaryLoading}
          value={platform?.totalUsers.toLocaleString('zh-CN') ?? '—'}
        />
        <AppStatCard
          label={t('admin:stats.periodRegistrations', { range: rangeLabel })}
          icon={UserPlus}
          iconClassName="text-emerald-600"
          iconBgClassName="bg-emerald-500/10"
          loading={summaryLoading}
          value={periodRegistrations.toLocaleString('zh-CN')}
        />
        <AppStatCard
          label={t('admin:stats.periodAgentRuns', { range: rangeLabel })}
          icon={Bot}
          iconClassName="text-rose-600"
          iconBgClassName="bg-rose-500/10"
          loading={summaryLoading}
          value={periodAgentRuns.toLocaleString('zh-CN')}
        />
        <AppStatCard
          label={t('admin:home.activeUsers')}
          icon={UserCheck}
          iconClassName="text-violet-600"
          iconBgClassName="bg-violet-500/10"
          loading={summaryLoading}
          value={platform?.activeUsers.toLocaleString('zh-CN') ?? '—'}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AppStatCard
          label={t('admin:stats.periodTokens', { range: rangeLabel })}
          icon={Zap}
          iconClassName="text-indigo-600"
          iconBgClassName="bg-indigo-500/10"
          loading={summaryLoading}
          value={formatTokenQuota(periodTokens)}
        />
        <AppStatCard
          label={t('admin:stats.periodCost', { range: rangeLabel })}
          icon={Zap}
          iconClassName="text-purple-600"
          iconBgClassName="bg-purple-500/10"
          loading={summaryLoading}
          value={formatCostMicros(periodCost)}
        />
        <AppStatCard
          label={t('admin:home.totalNovels')}
          icon={BookOpen}
          iconClassName="text-amber-600"
          iconBgClassName="bg-amber-500/10"
          loading={summaryLoading}
          value={content?.totalNovels.toLocaleString('zh-CN') ?? '—'}
        />
        <AppStatCard
          label={t('admin:home.totalAgentRuns')}
          icon={Bot}
          iconClassName="text-cyan-600"
          iconBgClassName="bg-cyan-500/10"
          loading={summaryLoading}
          value={content?.totalAgentRuns.toLocaleString('zh-CN') ?? '—'}
        />
      </div>

      <AppShellCard>
        <AppShellCardHeader
          title={t('admin:stats.title')}
          description={t('admin:stats.descExtended')}
          action={
            <AdminNativeSelect
              value={days}
              aria-label={t('admin:stats.dateRange')}
              className="w-full sm:w-auto"
              onChange={(e) => setDays(Number(e.target.value))}
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.days} value={opt.days}>
                  {opt.label}
                </option>
              ))}
            </AdminNativeSelect>
          }
        />
        <AppShellCardBody className="py-0">
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
        </AppShellCardBody>
      </AppShellCard>
    </AppPageStack>
  )
}
