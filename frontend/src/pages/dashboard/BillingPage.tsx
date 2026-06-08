import { useEffect, useState } from 'react'
import { Activity, BarChart3, CreditCard, Loader2, Receipt, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  fetchUsageCurrent,
  fetchUsageEvents,
  formatCostMicros,
  formatTokenCount,
  type UsageCurrent,
  type UsageEventItem,
} from '@/api/billingApi'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Card className="py-0 shadow-none">
        <CardHeader className="border-b px-6 py-5 [.border-b]:pb-5">
          <CardTitle className="text-base font-semibold">本月用量</CardTitle>
          <CardDescription>
            {usage ? `${usage.planName}（${usage.periodYyyyMm}）` : 'Token 与 API 调用统计'}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5 px-6 py-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              加载用量…
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
        </CardContent>
      </Card>

      <Card className="py-0 shadow-none">
        <CardHeader className="border-b px-6 py-5 [.border-b]:pb-5">
          <CardTitle className="text-base font-semibold">账单概览</CardTitle>
          <CardDescription>当前计费周期预估费用</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5 px-6 py-5">
          {loading ? (
            <Skeleton className="h-10 w-32" />
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
            升级 Pro / Enterprise 请
            <Link to="/contact" className="mx-1 font-medium text-primary hover:underline">
              联系客服
            </Link>
            ，管理员确认后将为您开通。在线支付功能即将上线。
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="h-10 flex-1 rounded-xl" variant="outline" asChild>
              <Link to="/pricing">
                <Receipt className="mr-2 size-4" />
                查看套餐
              </Link>
            </Button>
            <Button className="h-10 flex-1 rounded-xl" asChild>
              <Link to="/contact">
                联系升级
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {events.length > 0 || runFilter ? (
        <Card className="py-0 shadow-none">
          <CardHeader className="border-b px-6 py-5 [.border-b]:pb-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">
                  {runFilter ? 'Run 用量明细' : '最近用量明细'}
                </CardTitle>
                <CardDescription>
                  {runFilter
                    ? `runId: ${runFilter}`
                    : '点击 runId 可筛选该次对话的全部 LLM 调用'}
                </CardDescription>
              </div>
              {runFilter ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchParams({})}
                >
                  <X className="mr-1 size-3.5" />
                  清除筛选
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="px-0 py-0">
            {events.length === 0 ? (
              <p className="px-6 py-4 text-sm text-muted-foreground">该 run 暂无用量记录</p>
            ) : (
            <ul className="divide-y divide-border">
              {events.map((ev) => (
                <li key={ev.id} className="flex flex-col gap-1 px-6 py-3.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{ev.eventType}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {ev.totalTokens.toLocaleString('zh-CN')} tokens
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {ev.model ? <span>{ev.model}</span> : null}
                    <span>{new Date(ev.createdAt).toLocaleString('zh-CN')}</span>
                    {ev.runId ? (
                      runFilter ? (
                        <span className="font-mono truncate max-w-[240px]" title={ev.runId}>
                          run:{ev.runId}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="font-mono text-primary hover:underline"
                          title={ev.runId}
                          onClick={() => setSearchParams({ runId: ev.runId! })}
                        >
                          run:{ev.runId.slice(0, 8)}…
                        </button>
                      )
                    ) : null}
                    {ev.sessionId ? (
                      <Link
                        to={`/editor/${ev.sessionId}`}
                        className="text-primary hover:underline"
                      >
                        打开会话
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
