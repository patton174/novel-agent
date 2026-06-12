import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PlatformUsageTrendPoint } from '@/api/billingAdminApi'
import { formatCostMicros } from '@/api/billingAdminApi'
import {
  APP_CHART_EMPTY,
  APP_CHART_HEIGHT,
  AppChartCard,
} from '@/components/layout/AppPageStack'

const PIE_COLORS = ['#4f46e5', '#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706']

function formatChartDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

interface RevenueChartsProps {
  trends: PlatformUsageTrendPoint[]
  modelBreakdown: { model: string; tokens: number; costMicros: number }[]
}

export default function RevenueCharts({ trends, modelBreakdown }: RevenueChartsProps) {
  const tokenTrend = trends.map((p) => ({
    date: p.date,
    count: p.tokens,
  }))

  const costTrend = trends.map((p) => ({
    date: p.date,
    count: Math.round(p.costMicros / 1000) / 1000,
  }))

  const pieData = modelBreakdown.map((m) => ({
    name: m.model,
    value: m.costMicros,
    tokens: m.tokens,
  }))

  return (
    <>
      <AppChartCard title="全站 Token 消耗" description="近 30 日">
        {tokenTrend.length === 0 ? (
          <div className={APP_CHART_EMPTY}>暂无数据</div>
        ) : (
          <div className={APP_CHART_HEIGHT}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tokenTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatChartDate}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={48} />
                <Tooltip
                  labelFormatter={(label) => formatChartDate(String(label))}
                  formatter={(value) => [Number(value).toLocaleString('zh-CN'), 'Tokens']}
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
        )}
      </AppChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <AppChartCard title="LLM 成本趋势" description="近 30 日（元）">
          {costTrend.length === 0 ? (
            <div className={APP_CHART_EMPTY}>暂无数据</div>
          ) : (
            <div className={APP_CHART_HEIGHT}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={costTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    labelFormatter={(label) => formatChartDate(String(label))}
                    formatter={(value) => [`¥${Number(value).toFixed(4)}`, '成本']}
                  />
                  <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </AppChartCard>

        <AppChartCard title="模型成本分布" description="本月按模型">
          {pieData.length === 0 ? (
            <div className={APP_CHART_EMPTY}>暂无数据</div>
          ) : (
            <div className={APP_CHART_HEIGHT}>
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
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
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
          )}
        </AppChartCard>
      </div>
    </>
  )
}
