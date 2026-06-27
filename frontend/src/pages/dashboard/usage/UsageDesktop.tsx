import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { AppChartCard, AppPageIntro, AppPageStack } from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { TrendRangeToggle } from '@/components/billing/TrendRangeToggle'
import { ProTable, type ProColumn } from '@/components/pro/ProTable'
import type { UsageEventItem } from '@/api/billingApi'
import { UsageModelCell } from '@/components/billing/UsageModelCell'
import { UsageModelTrendChart } from '@/components/billing/UsageModelTrendChart'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { useUsageDetails } from './useUsageDetails'
import { BillingUsageContent } from '../billing/BillingSections'

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

/** 用量明细 — 桌面。 */
export function UsageDesktop() {
  const { t } = useTranslation(['dashboard'])
  const dateLocale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'
  const {
    usage,
    events,
    modelTrends,
    loading,
    runFilter,
    setRunFilter,
    tokenPercent,
    trendDays,
    setTrendDays,
  } = useUsageDetails()

  const eventColumns: ProColumn<UsageEventItem>[] = [
    {
      key: 'eventType',
      header: t('dashboard:billing.colType'),
      render: (ev) => <span className="font-medium text-foreground">{ev.eventType}</span>,
    },
    {
      key: 'tokens',
      header: t('dashboard:billing.colTokens'),
      align: 'right',
      render: (ev) => (
        <span className="tabular-nums text-muted-foreground">
          {ev.totalTokens.toLocaleString(dateLocale)}
        </span>
      ),
    },
    {
      key: 'model',
      header: t('dashboard:billing.colModel'),
      render: (ev) => <UsageModelCell ev={ev} />,
    },
    {
      key: 'time',
      header: t('dashboard:billing.colTime'),
      render: (ev) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {new Date(ev.createdAt).toLocaleString(dateLocale)}
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
    <AppPageStack className="gap-8">
      <AppPageIntro
        eyebrow={t('dashboard:usage.pageEyebrow')}
        title={t('dashboard:usage.pageTitle')}
      />

      <BillingUsageContent usage={usage} loading={loading} tokenPercent={tokenPercent} />

      <AppChartCard
        title={t('dashboard:usage.modelTrendTitle')}
        action={<TrendRangeToggle trendDays={trendDays} onChange={setTrendDays} />}
      >
        <UsageModelTrendChart trends={modelTrends} loading={loading} plain />
      </AppChartCard>

      <div>
        {runFilter ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs text-muted-foreground">runId: {runFilter}</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRunFilter('')}>
              <X className="mr-1 size-3.5" />
              {t('dashboard:billing.clearFilter')}
            </Button>
          </div>
        ) : null}
        <ProTable
          columns={eventColumns}
          data={events}
          rowKey="id"
          loading={loading}
          emptyText={
            runFilter ? t('dashboard:billing.emptyRun') : t('dashboard:billing.emptyRecent')
          }
        />
      </div>
    </AppPageStack>
  )
}
