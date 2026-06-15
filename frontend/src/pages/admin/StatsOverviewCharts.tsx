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

function TrendLineChart({ data, valueLabel }: { data: TrendPoint[]; valueLabel: string }) {
  return (
    <div className={APP_CHART_HEIGHT}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            tickFormatter={formatChartDate}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            labelFormatter={(label) => formatChartDate(String(label))}
            formatter={(value) => [Number(value).toLocaleString('zh-CN'), valueLabel]}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="var(--color-primary, #4f46e5)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function UsageTrendChart({
  data,
  dataKey,
  valueLabel,
  stroke,
}: {
  data: PlatformUsageTrendPoint[]
  dataKey: 'tokens' | 'costMicros'
  valueLabel: string
  stroke: string
}) {
  const chartData = data.map((p) => ({
    date: p.date,
    count: dataKey === 'costMicros' ? Math.round(p.costMicros / 10_000) / 100 : p.tokens,
  }))

  return (
    <div className={APP_CHART_HEIGHT}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            tickFormatter={formatChartDate}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={48} />
          <Tooltip
            labelFormatter={(label) => formatChartDate(String(label))}
            formatter={(value) => [
              dataKey === 'costMicros'
                ? `¥${Number(value).toFixed(2)}`
                : Number(value).toLocaleString('zh-CN'),
              valueLabel,
            ]}
          />
          <Line type="monotone" dataKey="count" stroke={stroke} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface StatsOverviewChartsProps {
  agentRunTrend: TrendPoint[]
  registrationTrend: TrendPoint[]
  usageTrend: PlatformUsageTrendPoint[]
  rangeLabel: string
}

export default function StatsOverviewCharts({
  agentRunTrend,
  registrationTrend,
  usageTrend,
  rangeLabel,
}: StatsOverviewChartsProps) {
  const { t } = useTranslation(['admin'])

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <AppChartCard title={t('admin:stats.agentRunTrend')} description={t('admin:stats.agentRunDesc', { range: rangeLabel })}>
          {agentRunTrend.length === 0 ? (
            <div className={APP_CHART_EMPTY}>{t('admin:stats.noAgentRunTrend')}</div>
          ) : (
            <TrendLineChart data={agentRunTrend} valueLabel={t('admin:stats.runCount')} />
          )}
        </AppChartCard>

        <AppChartCard title={t('admin:stats.registrationTrend')} description={t('admin:stats.registrationDesc', { range: rangeLabel })}>
          {registrationTrend.length === 0 ? (
            <div className={APP_CHART_EMPTY}>{t('admin:stats.noRegistrationTrend')}</div>
          ) : (
            <TrendLineChart data={registrationTrend} valueLabel={t('admin:stats.registrationCount')} />
          )}
        </AppChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AppChartCard title={t('admin:stats.tokenTrend')} description={t('admin:stats.tokenTrendDesc', { range: rangeLabel })}>
          {usageTrend.length === 0 ? (
            <div className={APP_CHART_EMPTY}>{t('admin:revenue.noData')}</div>
          ) : (
            <UsageTrendChart
              data={usageTrend}
              dataKey="tokens"
              valueLabel="Tokens"
              stroke="#4f46e5"
            />
          )}
        </AppChartCard>

        <AppChartCard title={t('admin:stats.costTrend')} description={t('admin:stats.costTrendDesc', { range: rangeLabel })}>
          {usageTrend.length === 0 ? (
            <div className={APP_CHART_EMPTY}>{t('admin:revenue.noData')}</div>
          ) : (
            <UsageTrendChart
              data={usageTrend}
              dataKey="costMicros"
              valueLabel={t('admin:revenue.cost')}
              stroke="#7c3aed"
            />
          )}
        </AppChartCard>
      </div>
    </>
  )
}
