import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { fetchStatsTrends, type TrendPoint } from '@/api/adminApi'
import { AdminNativeSelect } from '@/components/layout/AdminNativeSelect'
import { AppPageStack, AppShellCard, AppShellCardBody, AppShellCardHeader } from '@/components/layout/AppPageStack'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import { Skeleton } from '@/components/ui/skeleton'

const StatsTrendCharts = lazy(() => import('./StatsTrendCharts'))

const RANGE_OPTIONS = [
  { days: 7, label: '近 7 日' },
  { days: 30, label: '近 30 日' },
  { days: 90, label: '近 90 日' },
] as const

const chartAreaFallback = (
  <div className="space-y-6" aria-hidden>
    <Skeleton className="h-72 rounded-2xl" />
    <Skeleton className="h-72 rounded-2xl" />
  </div>
)

export default function StatsPage() {
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
      appToast.error(err instanceof Error ? err.message : '加载趋势数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTrends(days)
  }, [days, loadTrends])

  const rangeLabel = RANGE_OPTIONS.find((o) => o.days === days)?.label ?? `近 ${days} 日`

  return (
    <AppPageStack className="gap-4">
      <AppShellCard>
        <AppShellCardHeader
          title="趋势统计"
          description="Agent 调用与新用户注册"
          action={
            <AdminNativeSelect
              value={days}
              aria-label="日期范围"
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
