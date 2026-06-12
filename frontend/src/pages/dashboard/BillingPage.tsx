import { useEffect, useState } from 'react'
import { Activity, BarChart3, CreditCard, Receipt, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  fetchUsageCurrent,
  fetchUsageEvents,
  formatCostMicros,
  formatTokenCount,
  type UsageCurrent,
  type UsageEventItem,
} from '@/api/billingApi'
import {
  AppPageStack,
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { DataTableFrame } from '@/components/layout/DataTableFrame'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { appToast } from '@/stores/appToastStore'

export default function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const runFilter = searchParams.get('runId')?.trim() || ''
  const [usage, setUsage] = useState<UsageCurrent | null>(null)
  const [events, setEvents] = useState<UsageEventItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetchUsageCurrent(),
      fetchUsageEvents({ pageSize: runFilter ? 50 : 10, runId: runFilter || undefined }),
    ])
      .then(([current, page]) => {
        if (cancelled) return
        setUsage(current)
        setEvents(page.list)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        appToast.error(err instanceof Error ? err.message : '加载账单数据失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [runFilter])

  const tokenPercent =
    usage?.tokenQuota && usage.tokenQuota > 0
      ? Math.min(100, (usage.tokensUsed / usage.tokenQuota) * 100)
      : 0

  return (
    <AppPageStack narrow>
      <AppShellCard>
        <AppShellCardHeader
          title="本月用量"
          description={
            usage ? `${usage.planName}（${usage.periodYyyyMm}）` : 'Token 与 API 调用统计'
          }
        />
        <AppShellCardBody className="flex flex-col gap-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : usage ? (
            <>
              {usage.quotaWarning ? (
                <p className="rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
                  本月 Token 已使用 {usage.percentUsed.toFixed(1)}%，接近配额上限。
                </p>
              ) : null}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="size-4 shrink-0" />
                    本月 Tokens
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatTokenCount(usage.tokensUsed)}
                    {usage.tokenQuota != null ? ` / ${formatTokenCount(usage.tokenQuota)}` : ' / 不限'}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500"
                    style={{ width: `${tokenPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  已使用 {usage.percentUsed.toFixed(1)}%，配额每月 1 日重置
                </p>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3.5 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <BarChart3 className="size-4 shrink-0" />
                  Agent 运行次数
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {usage.runsUsed.toLocaleString('zh-CN')}
                  {usage.runQuota != null ? ` / ${usage.runQuota}` : ''}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">暂无用量数据</p>
          )}
        </AppShellCardBody>
      </AppShellCard>

      <AppShellCard>
        <AppShellCardHeader title="账单概览" description="当前计费周期预估费用" />
        <AppShellCardBody className="flex flex-col gap-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : usage ? (
            <div className="flex items-end justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="size-4 shrink-0" />
                  预估费用
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {formatCostMicros(usage.costMicros)}
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {usage.planCode === 'hobby' ? '免费套餐' : '按量估算'}
              </span>
            </div>
          ) : null}

          <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            升级 Pro / Enterprise 请先在
            <Link to="/pricing" className="mx-1 font-medium text-primary hover:underline">
              定价页
            </Link>
            了解方案，或通过
            <Link to="/contact" className="mx-1 font-medium text-primary hover:underline">
              联系我们
            </Link>
            开通。在线支付功能即将上线。
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="h-10 flex-1 rounded-xl" asChild>
              <Link to="/pricing">
                <Receipt className="mr-2 size-4" />
                查看套餐
              </Link>
            </Button>
            <Button className="h-10 flex-1 rounded-xl" variant="outline" asChild>
              <Link to="/contact">联系升级</Link>
            </Button>
          </div>
        </AppShellCardBody>
      </AppShellCard>

      <AppShellCard>
        <AppShellCardHeader
          title={runFilter ? 'Run 用量明细' : '最近用量明细'}
          description={
            runFilter
              ? `runId: ${runFilter}`
              : '点击 runId 可筛选该次对话的全部 LLM 调用'
          }
          action={
            runFilter ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSearchParams({})}>
                <X className="mr-1 size-3.5" />
                清除筛选
              </Button>
            ) : undefined
          }
        />
        <AppShellCardBody className="px-0 py-0">
          {loading ? (
            <div className="space-y-2 px-6 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : events.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              {runFilter ? '该 run 暂无用量记录' : '暂无用量明细，使用 Agent 后将在此展示最近调用'}
            </p>
          ) : (
            <DataTableFrame embedded>
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">类型</th>
                    <th className="px-4 py-3 font-medium">Tokens</th>
                    <th className="px-4 py-3 font-medium">模型</th>
                    <th className="px-4 py-3 font-medium">时间</th>
                    <th className="px-4 py-3 font-medium">关联</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {events.map((ev) => (
                    <UsageEventRow key={ev.id} ev={ev} runFilter={runFilter} />
                  ))}
                </tbody>
              </table>
            </DataTableFrame>
          )}
        </AppShellCardBody>
      </AppShellCard>
    </AppPageStack>
  )
}

function UsageEventRow({
  ev,
  runFilter,
}: {
  ev: UsageEventItem
  runFilter: string
}) {
  const [, setSearchParams] = useSearchParams()

  return (
    <tr className="align-top hover:bg-surface-hover/50">
      <td className="px-4 py-3 font-medium text-foreground">{ev.eventType}</td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">
        {ev.totalTokens.toLocaleString('zh-CN')}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{ev.model ?? '—'}</td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
        {new Date(ev.createdAt).toLocaleString('zh-CN')}
      </td>
      <td className="px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {ev.runId ? (
            runFilter ? (
              <span className="max-w-[160px] truncate font-mono text-muted-foreground" title={ev.runId}>
                {ev.runId}
              </span>
            ) : (
              <button
                type="button"
                className="font-mono text-primary hover:underline"
                title={ev.runId}
                onClick={() => setSearchParams({ runId: ev.runId! })}
              >
                {ev.runId.slice(0, 10)}…
              </button>
            )
          ) : null}
          {ev.sessionId ? (
            <Link to={`/editor/${ev.sessionId}`} className="text-primary hover:underline">
              打开会话
            </Link>
          ) : null}
        </div>
      </td>
    </tr>
  )
}
