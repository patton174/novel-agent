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
import { Link } from 'react-router-dom'
import type { TrendPoint } from '@/api/adminApi'
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

function TrendChart({ data, valueLabel }: { data: TrendPoint[]; valueLabel: string }) {
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
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface StatsTrendChartsProps {
  agentRunTrend: TrendPoint[]
  registrationTrend: TrendPoint[]
  rangeLabel: string
}

export default function StatsTrendCharts({
  agentRunTrend,
  registrationTrend,
  rangeLabel,
}: StatsTrendChartsProps) {
  const { t } = useTranslation(['admin'])
  return (
    <>
      <AppChartCard title={t('admin:stats.agentRunTrend')} description={t('admin:stats.agentRunDesc', { range: rangeLabel })}>
        {agentRunTrend.length === 0 ? (
          <div className={APP_CHART_EMPTY}>
            <p>{t('admin:stats.noAgentRunTrend')}</p>
            <Link to="/admin/users" className="mt-2 inline-block text-sm text-primary hover:underline">
              {t('admin:stats.viewUsers')}
            </Link>
          </div>
        ) : (
          <TrendChart data={agentRunTrend} valueLabel={t('admin:stats.runCount')} />
        )}
      </AppChartCard>

      <AppChartCard title={t('admin:stats.registrationTrend')} description={t('admin:stats.registrationDesc', { range: rangeLabel })}>
        {registrationTrend.length === 0 ? (
          <div className={APP_CHART_EMPTY}>
            <p>{t('admin:stats.noRegistrationTrend')}</p>
            <Link to="/admin/users" className="mt-2 inline-block text-sm text-primary hover:underline">
              {t('admin:stats.viewUsers')}
            </Link>
          </div>
        ) : (
          <TrendChart data={registrationTrend} valueLabel={t('admin:stats.registrationCount')} />
        )}
      </AppChartCard>
    </>
  )
}
