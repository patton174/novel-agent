import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { AppPageStack } from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { ProTabs } from '@/components/pro/ProTabs'
import { ProTable, type ProColumn } from '@/components/pro/ProTable'
import type { UsageEventItem } from '@/api/billingApi'
import { useTranslation } from 'react-i18next'
import { useBilling } from './useBilling'
import { BillingBillContent, BillingUsageContent } from './BillingSections'

function UsageEventRelatedCell({
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
  )
}

/** 账单 — 桌面：ProTabs（用量 / 账单 / 明细），明细用 ProTable。 */
export function BillingDesktop() {
  const { t } = useTranslation(['dashboard'])
  const { usage, events, loading, runFilter, setRunFilter, tokenPercent } = useBilling()

  const eventColumns: ProColumn<UsageEventItem>[] = [
    {
      key: 'eventType',
      header: t('dashboard:billing.colType'),
      render: (ev) => <span className="font-medium text-foreground">{ev.eventType}</span>,
    },
    {
      key: 'tokens',
      header: 'Tokens',
      align: 'right',
      render: (ev) => (
        <span className="tabular-nums text-muted-foreground">
          {ev.totalTokens.toLocaleString('zh-CN')}
        </span>
      ),
    },
    {
      key: 'model',
      header: t('dashboard:billing.colModel'),
      render: (ev) => <span className="text-muted-foreground">{ev.model ?? '—'}</span>,
    },
    {
      key: 'time',
      header: t('dashboard:billing.colTime'),
      render: (ev) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {new Date(ev.createdAt).toLocaleString('zh-CN')}
        </span>
      ),
    },
    {
      key: 'related',
      header: t('dashboard:billing.colRelated'),
      render: (ev) => (
        <UsageEventRelatedCell ev={ev} runFilter={runFilter} onPickRun={setRunFilter} />
      ),
    },
  ]

  return (
    <AppPageStack>
      <ProTabs
        tabs={[
          {
            key: 'usage',
            label: t('dashboard:billing.usageTitle'),
            content: (
              <div className="max-w-2xl space-y-4">
                <p className="text-sm text-muted-foreground">
                  {usage
                    ? `${usage.planName}（${usage.periodYyyyMm}）`
                    : t('dashboard:billing.usageDesc')}
                </p>
                <BillingUsageContent
                  usage={usage}
                  loading={loading}
                  tokenPercent={tokenPercent}
                />
              </div>
            ),
          },
          {
            key: 'bill',
            label: t('dashboard:billing.billTitle'),
            content: (
              <div className="max-w-2xl space-y-4">
                <p className="text-sm text-muted-foreground">{t('dashboard:billing.billDesc')}</p>
                <BillingBillContent usage={usage} loading={loading} />
              </div>
            ),
          },
          {
            key: 'events',
            label: t('dashboard:billing.recentUsageTitle'),
            content: (
              <div>
                {runFilter ? (
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard:billing.runUsageDesc', { id: runFilter })}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRunFilter('')}
                    >
                      <X className="mr-1 size-3.5" />
                      {t('dashboard:billing.clearFilter')}
                    </Button>
                  </div>
                ) : (
                  <p className="mb-3 text-sm text-muted-foreground">
                    {t('dashboard:billing.recentUsageDesc')}
                  </p>
                )}
                <ProTable
                  columns={eventColumns}
                  data={events}
                  rowKey="id"
                  loading={loading}
                  emptyText={
                    runFilter
                      ? t('dashboard:billing.emptyRun')
                      : t('dashboard:billing.emptyRecent')
                  }
                />
              </div>
            ),
          },
        ]}
      />
    </AppPageStack>
  )
}
