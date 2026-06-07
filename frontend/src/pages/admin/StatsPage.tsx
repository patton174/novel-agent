import { lazy, Suspense, useEffect, useState } from 'react'
import { fetchStatsTrends, type TrendPoint } from '@/api/adminApi'
import { appToast } from '@/stores/appToastStore'
import { Skeleton } from '@/components/ui/skeleton'

const StatsTrendCharts = lazy(() => import('./StatsTrendCharts'))

export default function StatsPage() {
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
    return (
      <div className="space-y-6">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    )
  }

  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      }
    >
      <div className="space-y-6">
        <StatsTrendCharts
          agentRunTrend={agentRunTrend!}
          registrationTrend={registrationTrend ?? []}
        />
      </div>
    </Suspense>
  )
}
