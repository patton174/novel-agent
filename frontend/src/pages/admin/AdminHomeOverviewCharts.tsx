import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TrendPoint } from '@/api/adminApi'
import type { PlatformUsageTrendPoint } from '@/api/billingAdminApi'
import {
  APP_CHART_EMPTY,
  APP_CHART_HEIGHT,
  AppChartCard,
} from '@/components/layout/AppPageStack'

function formatChartDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function TrendLineChart({
  data,
  valueLabel,
  stroke = 'var(--color-primary, #4f46e5)',
  yFormatter,
}: {
  data: { date: string; count: number }[]
  valueLabel: string
  stroke?: string
  yFormatter?: (value: number) => string
}) {
  return (
    <div className={APP_CHART_HEIGHT}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            tickFormatter={formatChartDate}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={yFormatter}
          />
          <Tooltip
            labelFormatter={(label) => formatChartDate(String(label))}
            formatter={(value) => [
              yFormatter ? yFormatter(Number(value)) : Number(value).toLocaleString('zh-CN'),
              valueLabel,
            ]}
          />
          <Line type="monotone" dataKey="count" stroke={stroke} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

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

  const tokenTrend = usageTrend.map((p) => ({ date: p.date, count: p.tokens }))
  const costTrend = usageTrend.map((p) => ({
    date: p.date,
    count: Math.round(p.costMicros / 10_000) / 100,
  }))

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <AppChartCard
        title={t('admin:home.chartRegistration')}
        description={t('admin:home.chartRegistrationDesc', { range: rangeLabel })}
      >
        {registrationTrend.length === 0 ? (
          <div className={APP_CHART_EMPTY}>{t('admin:stats.noRegistrationTrend')}</div>
        ) : (
          <TrendLineChart
            data={registrationTrend}
            valueLabel={t('admin:stats.registrationCount')}
            stroke="#059669"
          />
        )}
      </AppChartCard>

      <AppChartCard
        title={t('admin:home.chartTokens')}
        description={t('admin:home.chartTokensDesc', { range: rangeLabel })}
      >
        {tokenTrend.length === 0 ? (
          <div className={APP_CHART_EMPTY}>{t('admin:revenue.noData')}</div>
        ) : (
          <TrendLineChart
            data={tokenTrend}
            valueLabel="Tokens"
            stroke="#4f46e5"
            yFormatter={(v) => v.toLocaleString('zh-CN')}
          />
        )}
      </AppChartCard>

      <AppChartCard
        title={t('admin:home.chartCost')}
        description={t('admin:home.chartCostDesc', { range: rangeLabel })}
      >
        {costTrend.length === 0 ? (
          <div className={APP_CHART_EMPTY}>{t('admin:revenue.noData')}</div>
        ) : (
          <TrendLineChart
            data={costTrend}
            valueLabel={t('admin:revenue.cost')}
            stroke="#7c3aed"
            yFormatter={(v) => `¥${v.toFixed(2)}`}
          />
        )}
      </AppChartCard>
    </div>
  )
}
