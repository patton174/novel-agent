import { useTranslation } from 'react-i18next'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { fetchStatsTrends, type TrendPoint } from '@/api/adminApi'
import { AdminNativeSelect } from '@/components/layout/AdminNativeSelect'
import { AppPageStack, AppShellCard, AppShellCardBody, AppShellCardHeader } from '@/components/layout/AppPageStack'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import { Skeleton } from '@/components/ui/skeleton'

const StatsTrendCharts = lazy(() => import('./StatsTrendCharts'))

const chartAreaFallback = (
  <div className="space-y-6" aria-hidden>
    <Skeleton className="h-72 rounded-2xl" />
    <Skeleton className="h-72 rounded-2xl" />
  </div>
)

export default function StatsPage() {
  const { t } = useTranslation(['admin'])
  useMarkRouteSeen()
  const [days, setDays] = useState(30)
  const [agentRunTrend, setAgentRunTrend] = useState<TrendPoint[] | null>(null)
  const [registrationTrend, setRegistrationTrend] = useState<TrendPoint[] | null>(null)
  const [loading, setLoading] = useState(true)

  const loadTrends = useCallback(async (rangeDays: number) => {
    setLoading(true)
    try {
      const data = await fetchStatsTrends(rangeDays)
      setAgentRunTrend(data.agentRunTrend)
      setRegistrationTrend(data.registrationTrend)
    } catch (err: unknown) {
      setAgentRunTrend([])
      setRegistrationTrend([])
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

  return (
    <AppPageStack className="gap-4">
      <AppShellCard>
        <AppShellCardHeader
          title={t('admin:stats.title')}
          description={t('admin:stats.desc')}
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
              <StatsTrendCharts
                agentRunTrend={agentRunTrend}
                registrationTrend={registrationTrend ?? []}
                rangeLabel={rangeLabel}
              />
            </Suspense>
          )}
        </AppShellCardBody>
      </AppShellCard>
    </AppPageStack>
  )
}
