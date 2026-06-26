import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { PlatformUsageTrendPoint } from '@/api/billingAdminApi'
import { formatCostMicros } from '@/api/billingAdminApi'
import {
  PixelChartCard,
  PixelLineChart,
  PIXEL_CHART_EMPTY,
  PIXEL_CHART_HEIGHT,
} from '@/components/pixel'
import {
  formatPixelChartDate,
  pixelChartNeon,
  pixelChartSeriesColors,
  pixelChartTooltipStyle,
} from '@/components/pixel/charts/pixelChartTheme'
import { mapUsageTrendPoints } from '@/components/pixel/charts/PixelUsageTrendChart'

interface RevenueChartsProps {
  trends?: PlatformUsageTrendPoint[]
  modelBreakdown?: { model: string; tokens: number; costMicros: number }[]
}

export default function RevenueCharts({
  trends = [],
  modelBreakdown = [],
}: RevenueChartsProps) {
  const { t } = useTranslation(['admin'])
  const tokenTrend = mapUsageTrendPoints(trends).map((p) => ({ date: p.date, count: p.tokens }))
  const costTrend = mapUsageTrendPoints(trends).map((p) => ({ date: p.date, count: p.cost }))

  const pieData = modelBreakdown.map((m) => ({
    name: m.model,
    value: m.costMicros,
    tokens: m.tokens,
  }))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <PixelChartCard title={t('admin:stats.tokenTrend')} description={t('admin:revenue.last30Days')}>
        <PixelLineChart
          data={tokenTrend}
          xKey="date"
          series={[{ key: 'count', name: 'Tokens', color: pixelChartNeon.purple, fill: true }]}
          emptyText={t('admin:revenue.noData')}
          formatX={formatPixelChartDate}
          formatY={(v) => v.toLocaleString('zh-CN')}
        />
      </PixelChartCard>

      <PixelChartCard title={t('admin:stats.costTrend')} description={t('admin:revenue.last30DaysCny')}>
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
        title={t('admin:revenue.modelDistribution')}
        description={t('admin:revenue.thisMonthByModel')}
        className="lg:col-span-2"
      >
        {pieData.length === 0 ? (
          <div className={PIXEL_CHART_EMPTY}>{t('admin:revenue.noData')}</div>
        ) : (
          <div className="space-y-3">
            <div className={PIXEL_CHART_HEIGHT}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={88}
                    label={false}
                    stroke="var(--pixel-border)"
                    strokeWidth={1}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={pixelChartSeriesColors[i % pixelChartSeriesColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={pixelChartTooltipStyle}
                    labelFormatter={(label) => String(label)}
                    formatter={(value, name, item) => {
                      const payload = item?.payload as { tokens?: number } | undefined
                      return [
                        `${formatCostMicros(Number(value))} · ${(payload?.tokens ?? 0).toLocaleString('zh-CN')} tok`,
                        String(name),
                      ]
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 px-1 text-xs">
              {pieData.map((entry, i) => {
                const color = pixelChartSeriesColors[i % pixelChartSeriesColors.length]
                return (
                  <li key={entry.name} className="flex min-w-0 items-center gap-1.5">
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate" style={{ color }}>
                      {entry.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatCostMicros(entry.value)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </PixelChartCard>
    </div>
  )
}
