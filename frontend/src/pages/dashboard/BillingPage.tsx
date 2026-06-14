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
import {
  ResponsiveTable,
  type ResponsiveTableColumn,
} from '@/components/layout/ResponsiveTable'
import { Button } from '@/components/ui/button'
import { APP_BTN_MD } from '@/lib/appButtonTokens'
import { Skeleton } from '@/components/ui/skeleton'
import { appToast } from '@/stores/appToastStore'

import { useTranslation } from 'react-i18next'

export default function BillingPage() {
  const { t } = useTranslation(['dashboard'])
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
        appToast.error(err instanceof Error ? err.message : t('dashboard:billing.loadFail'))
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
    <AppPageStack compact>
      <AppShellCard>
        <AppShellCardHeader
          title={t('dashboard:billing.usageTitle')}
          description={
            usage ? `${usage.planName}（${usage.periodYyyyMm}）` : t('dashboard:billing.usageDesc')
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
                  {t('dashboard:billing.quotaWarning', { percent: usage.percentUsed.toFixed(1) })}
                </p>
              ) : null}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="size-4 shrink-0" />
                    {t('dashboard:billing.monthTokens')}
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatTokenCount(usage.tokensUsed)}
                    {usage.tokenQuota != null ? ` / ${formatTokenCount(usage.tokenQuota)}` : t('dashboard:billing.unlimited')}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500"
                    style={{ width: `${tokenPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard:billing.percentUsed', { percent: usage.percentUsed.toFixed(1) })}
                </p>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3.5 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <BarChart3 className="size-4 shrink-0" />
                  {t('dashboard:billing.agentRuns')}
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {usage.runsUsed.toLocaleString('zh-CN')}
                  {usage.runQuota != null ? ` / ${usage.runQuota}` : ''}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('dashboard:billing.noData')}</p>
          )}
        </AppShellCardBody>
      </AppShellCard>

      <AppShellCard>
        <AppShellCardHeader title={t('dashboard:billing.billTitle')} description={t('dashboard:billing.billDesc')} />
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
                  {t('dashboard:billing.estCost')}
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {formatCostMicros(usage.costMicros)}
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {usage.planCode === 'hobby' ? t('dashboard:billing.freePlan') : t('dashboard:billing.payAsYouGo')}
              </span>
            </div>
          ) : null}

          <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            {t('dashboard:billing.upgradeHint1')}
            <Link to="/pricing" className="mx-1 font-medium text-primary hover:underline">
              {t('dashboard:billing.pricingPage')}
            </Link>
            {t('dashboard:billing.upgradeHint2')}
            <Link to="/contact" className="mx-1 font-medium text-primary hover:underline">
              {t('dashboard:billing.contactUs')}
            </Link>
            {t('dashboard:billing.upgradeHint3')}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className={`flex-1 ${APP_BTN_MD}`} asChild>
              <Link to="/pricing">
                <Receipt className="mr-2 size-4" />
                {t('dashboard:billing.viewPlans')}
              </Link>
            </Button>
            <Button className={`flex-1 ${APP_BTN_MD}`} variant="outline" asChild>
              <Link to="/contact">{t('dashboard:billing.contactUpgrade')}</Link>
            </Button>
          </div>
        </AppShellCardBody>
      </AppShellCard>

      <AppShellCard>
        <AppShellCardHeader
          title={runFilter ? t('dashboard:billing.runUsageTitle') : t('dashboard:billing.recentUsageTitle')}
          description={
            runFilter
              ? t('dashboard:billing.runUsageDesc', { id: runFilter })
              : t('dashboard:billing.recentUsageDesc')
          }
          action={
            runFilter ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSearchParams({})}>
                <X className="mr-1 size-3.5" />
                {t('dashboard:billing.clearFilter')}
              </Button>
            ) : undefined
          }
        />
        <AppShellCardBody className="px-0 py-0">
          <UsageEventsTable
            loading={loading}
            events={events}
            runFilter={runFilter}
          />
        </AppShellCardBody>
      </AppShellCard>
    </AppPageStack>
  )
}

function UsageEventsTable({
  loading,
  events,
  runFilter,
}: {
  loading: boolean
  events: UsageEventItem[]
  runFilter: string
}) {
  const { t } = useTranslation(['dashboard'])
  const columns: ResponsiveTableColumn<UsageEventItem>[] = [
    {
      key: 'eventType',
      header: t('dashboard:billing.colType'),
      headerClassName: 'px-4 py-3 font-medium',
      cellClassName: 'px-4 py-3 font-medium text-foreground',
      renderCell: (ev) => ev.eventType,
    },
    {
      key: 'tokens',
      header: 'Tokens',
      headerClassName: 'px-4 py-3 font-medium',
      cellClassName: 'px-4 py-3 tabular-nums text-muted-foreground',
      renderCell: (ev) => ev.totalTokens.toLocaleString('zh-CN'),
    },
    {
      key: 'model',
      header: t('dashboard:billing.colModel'),
      headerClassName: 'px-4 py-3 font-medium',
      cellClassName: 'px-4 py-3 text-muted-foreground',
      renderCell: (ev) => ev.model ?? '—',
    },
    {
      key: 'time',
      header: t('dashboard:billing.colTime'),
      headerClassName: 'px-4 py-3 font-medium',
      cellClassName: 'whitespace-nowrap px-4 py-3 text-xs text-muted-foreground',
      renderCell: (ev) => new Date(ev.createdAt).toLocaleString('zh-CN'),
    },
    {
      key: 'related',
      header: t('dashboard:billing.colRelated'),
      headerClassName: 'px-4 py-3 font-medium',
      cellClassName: 'px-4 py-3 text-xs',
      renderCell: (ev) => <UsageEventRelatedCell ev={ev} runFilter={runFilter} />,
    },
  ]

  return (
    <ResponsiveTable
      columns={columns}
      rows={events}
      loading={loading}
      loadingRowCount={3}
      loadingCardCount={3}
      getRowKey={(ev) => ev.id}
      wrapDesktopInCard={false}
      tableClassName="w-full min-w-[640px] text-sm"
      tableHeaderClassName="bg-muted/40 text-left text-xs text-muted-foreground"
      tableBodyClassName="divide-y divide-border"
      renderMobileCard={(ev) => <UsageEventCard ev={ev} runFilter={runFilter} />}
      mobileListClassName="px-4 py-4"
      renderMobileEmpty={
        <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          {runFilter ? t('dashboard:billing.emptyRun') : t('dashboard:billing.emptyRecent')}
        </p>
      }
      renderDesktopEmpty={
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          {runFilter ? t('dashboard:billing.emptyRun') : t('dashboard:billing.emptyRecent')}
        </p>
      }
    />
  )
}

function UsageEventRelatedCell({
  ev,
  runFilter,
}: {
  ev: UsageEventItem
  runFilter: string
}) {
  const [, setSearchParams] = useSearchParams()
  const { t } = useTranslation(['dashboard'])

  return (
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
          {t('dashboard:billing.openSession')}
        </Link>
      ) : null}
    </div>
  )
}

function UsageEventCard({
  ev,
  runFilter,
}: {
  ev: UsageEventItem
  runFilter: string
}) {
  const [, setSearchParams] = useSearchParams()
  const { t } = useTranslation(['dashboard'])

  return (
    <article className="rounded-xl border border-border bg-surface p-3.5 text-sm shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-foreground">{ev.eventType}</span>
        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
          {ev.totalTokens.toLocaleString('zh-CN')} tok
        </span>
      </div>
      <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between gap-2">
          <dt>{t('dashboard:billing.colModel')}</dt>
          <dd className="truncate text-right text-foreground">{ev.model ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{t('dashboard:billing.colTime')}</dt>
          <dd className="text-right">{new Date(ev.createdAt).toLocaleString('zh-CN')}</dd>
        </div>
      </dl>
      {(ev.runId || ev.sessionId) ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2.5 text-xs">
          {ev.runId ? (
            runFilter ? (
              <span className="max-w-full truncate font-mono text-muted-foreground" title={ev.runId}>
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
              {t('dashboard:billing.openSession')}
            </Link>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

