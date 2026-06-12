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
}

export default function StatsTrendCharts({ agentRunTrend, registrationTrend }: StatsTrendChartsProps) {
  return (
    <>
      <AppChartCard title="Agent 调用趋势" description="近 30 日 Agent 运行次数">
        {agentRunTrend.length === 0 ? (
          <div className={APP_CHART_EMPTY}>暂无趋势数据</div>
        ) : (
          <TrendChart data={agentRunTrend} valueLabel="调用次数" />
        )}
      </AppChartCard>

      {registrationTrend.length > 0 ? (
        <AppChartCard title="注册趋势" description="近 30 日新用户注册">
          <TrendChart data={registrationTrend} valueLabel="注册数" />
        </AppChartCard>
      ) : null}
    </>
  )
}
