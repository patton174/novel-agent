import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import {
  AppPageStack,
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { UsageEventItem } from '@/api/billingApi'
import { useTranslation } from 'react-i18next'
import { useBilling } from './useBilling'
import { BillingBillContent, BillingUsageContent } from './BillingSections'

function UsageEventCard({
  ev,
  runFilter,
  onPickRun,
}: {
  ev: UsageEventItem
  runFilter: string
  onPickRun: (next: string) => void
}) {
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
      {ev.runId || ev.sessionId ? (
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
                onClick={() => onPickRun(ev.runId!)}
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

/** 账单 — 手机：纵向堆叠（用量 / 账单 / 明细卡片）。 */
export function BillingMobile() {
  const { t } = useTranslation(['dashboard'])
  const { usage, events, loading, runFilter, setRunFilter, tokenPercent } = useBilling()

  return (
    <AppPageStack compact>
      <AppShellCard>
        <AppShellCardHeader
          title={t('dashboard:billing.usageTitle')}
          description={
            usage
              ? `${usage.planName}（${usage.periodYyyyMm}）`
              : t('dashboard:billing.usageDesc')
          }
        />
        <AppShellCardBody className="flex flex-col gap-5">
          <BillingUsageContent usage={usage} loading={loading} tokenPercent={tokenPercent} />
        </AppShellCardBody>
      </AppShellCard>

      <AppShellCard>
        <AppShellCardHeader
          title={t('dashboard:billing.billTitle')}
          description={t('dashboard:billing.billDesc')}
        />
        <AppShellCardBody className="flex flex-col gap-5">
          <BillingBillContent usage={usage} loading={loading} />
        </AppShellCardBody>
      </AppShellCard>

      <AppShellCard>
        <AppShellCardHeader
          title={
            runFilter
              ? t('dashboard:billing.runUsageTitle')
              : t('dashboard:billing.recentUsageTitle')
          }
          description={
            runFilter
              ? t('dashboard:billing.runUsageDesc', { id: runFilter })
              : t('dashboard:billing.recentUsageDesc')
          }
          action={
            runFilter ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setRunFilter('')}>
                <X className="mr-1 size-3.5" />
                {t('dashboard:billing.clearFilter')}
              </Button>
            ) : undefined
          }
        />
        <AppShellCardBody className="px-0 py-0">
          {loading ? (
            <div className="space-y-3 px-4 py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              {runFilter ? t('dashboard:billing.emptyRun') : t('dashboard:billing.emptyRecent')}
            </p>
          ) : (
            <div className="space-y-3 px-4 py-4">
              {events.map((ev) => (
                <UsageEventCard
                  key={ev.id}
                  ev={ev}
                  runFilter={runFilter}
                  onPickRun={setRunFilter}
                />
              ))}
            </div>
          )}
        </AppShellCardBody>
      </AppShellCard>
    </AppPageStack>
  )
}
