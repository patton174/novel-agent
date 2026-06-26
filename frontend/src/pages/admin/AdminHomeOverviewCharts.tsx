import { useTranslation } from 'react-i18next'
import type { TrendPoint } from '@/api/adminApi'
import type { PlatformUsageTrendPoint } from '@/api/billingAdminApi'
import { PixelChartCard, PixelLineChart } from '@/components/pixel'
import { formatPixelChartDate, pixelChartNeon } from '@/components/pixel/charts/pixelChartTheme'
import { mapUsageTrendPoints } from '@/components/pixel/charts/PixelUsageTrendChart'

interface AdminHomeOverviewChartsProps {
  registrationTrend: TrendPoint[]
  usageTrend: PlatformUsageTrendPoint[]
  rangeLabel: string
}

export default function AdminHomeOverviewCharts({
  registrationTrend,
  usageTrend,
  rangeLabel,
}: AdminHomeOverviewChartsProps) {
  const { t } = useTranslation(['admin'])
  const tokenTrend = mapUsageTrendPoints(usageTrend).map((p) => ({ date: p.date, count: p.tokens }))
  const costTrend = mapUsageTrendPoints(usageTrend).map((p) => ({ date: p.date, count: p.cost }))

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <PixelChartCard
        title={t('admin:stats.tokenTrend')}
        description={t('admin:stats.tokenTrendDesc', { range: rangeLabel })}
      >
        <PixelLineChart
          data={tokenTrend}
          xKey="date"
          series={[{ key: 'count', name: 'Tokens', color: pixelChartNeon.purple, fill: true }]}
          emptyText={t('admin:revenue.noData')}
          formatX={formatPixelChartDate}
          formatY={(v) => v.toLocaleString('zh-CN')}
        />
      </PixelChartCard>

      <PixelChartCard
        title={t('admin:stats.costTrend')}
        description={t('admin:stats.costTrendDesc', { range: rangeLabel })}
      >
        <PixelLineChart
          data={costTrend}
          xKey="date"
          series={[
            {
              key: 'count',
              name: t('admin:revenue.cost'),
              color: pixelChartNeon.green,
              fill: true,
            },
          ]}
          emptyText={t('admin:revenue.noData')}
          formatX={formatPixelChartDate}
          formatY={(v) => `¥${v.toFixed(2)}`}
          formatTooltipValue={(v) => [`¥${v.toFixed(2)}`, t('admin:revenue.cost')]}
        />
      </PixelChartCard>

      <PixelChartCard
        title={t('admin:home.chartRegistration')}
        description={t('admin:home.chartRegistrationDesc', { range: rangeLabel })}
        className="lg:col-span-2 xl:col-span-1"
      >
        <PixelLineChart
          data={registrationTrend}
          xKey="date"
          series={[
            {
              key: 'count',
              name: t('admin:stats.registrationCount'),
              color: pixelChartNeon.cyan,
              fill: true,
            },
          ]}
          emptyText={t('admin:stats.noRegistrationTrend')}
          formatX={formatPixelChartDate}
        />
      </PixelChartCard>
    </div>
  )
}
