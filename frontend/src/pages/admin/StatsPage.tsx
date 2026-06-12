import { lazy, Suspense, useEffect, useState } from 'react'
import { fetchStatsTrends, type TrendPoint } from '@/api/adminApi'
import { AppPageStack } from '@/components/layout/AppPageStack'
import { ContentPending } from '@/components/loading/ContentPending'
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
  useMarkRouteSeen()
  const [agentRunTrend, setAgentRunTrend] = useState<TrendPoint[] | null>(null)
  const [registrationTrend, setRegistrationTrend] = useState<TrendPoint[] | null>(null)

  useEffect(() => {
    let cancelled = false

    void fetchStatsTrends(30)
      .then((data) => {
        if (cancelled) return
        setAgentRunTrend(data.agentRunTrend)
        setRegistrationTrend(data.registrationTrend)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setAgentRunTrend([])
        setRegistrationTrend([])
        appToast.error(err instanceof Error ? err.message : '加载趋势数据失败')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const loading = agentRunTrend === null

  if (loading) {
    return <ContentPending label="正在加载趋势数据" />
  }

  return (
    <Suspense fallback={chartAreaFallback}>
      <AppPageStack>
        <StatsTrendCharts
          agentRunTrend={agentRunTrend!}
          registrationTrend={registrationTrend ?? []}
        />
      </AppPageStack>
    </Suspense>
  )
}
