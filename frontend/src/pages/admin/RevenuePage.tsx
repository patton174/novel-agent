import { lazy, Suspense, useEffect, useState } from 'react'
import {
  fetchPlatformUsageOverview,
  fetchPlatformUsageTrends,
  formatCostMicros,
  formatTokenQuota,
  type PlatformUsageOverview,
  type PlatformUsageTrendPoint,
} from '@/api/billingAdminApi'
import { ContentPending } from '@/components/loading/ContentPending'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0 text-xs text-muted-foreground">{hint}</CardContent>
      ) : null}
    </Card>
  )
}

export default function RevenuePage() {
  useMarkRouteSeen()
  const [overview, setOverview] = useState<PlatformUsageOverview | null>(null)
  const [trends, setTrends] = useState<PlatformUsageTrendPoint[] | null>(null)

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
        appToast.error(err instanceof Error ? err.message : '加载收入数据失败')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!overview || trends === null) {
    return <ContentPending label="加载收入与成本…" />
  }

  const mrrYuan = overview.mrrCents / 100
  const subsSummary = Object.entries(overview.activeSubscriptions)
    .map(([code, count]) => `${code}: ${count}`)
    .join(' · ')

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="MRR（月经常性收入）"
          value={`¥${mrrYuan.toFixed(0)}`}
          hint={subsSummary || '暂无活跃订阅'}
        />
        <StatCard
          title="本月 Token 消耗"
          value={formatTokenQuota(overview.monthTokensTotal)}
        />
        <StatCard
          title="本月 LLM 成本（估算）"
          value={formatCostMicros(overview.monthCostMicros)}
        />
        <StatCard
          title="本月订阅收入（估算）"
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
    </div>
  )
}
