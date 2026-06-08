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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

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
      <Card>
        <CardHeader>
          <CardTitle>全站 Token 消耗</CardTitle>
          <CardDescription>近 30 日</CardDescription>
        </CardHeader>
        <CardContent>
          {tokenTrend.length === 0 ? (
            <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <div className="h-60 w-full md:h-72">
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
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>LLM 成本趋势</CardTitle>
            <CardDescription>近 30 日（元）</CardDescription>
          </CardHeader>
          <CardContent>
            {costTrend.length === 0 ? (
              <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
                暂无数据
              </div>
            ) : (
              <div className="h-60 w-full">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>模型成本分布</CardTitle>
            <CardDescription>本月按模型</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
                暂无数据
              </div>
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={88}
                      label={({ name }) => String(name)}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, item) => {
                        const payload = item?.payload as { tokens?: number } | undefined
                        return [
                          `${formatCostMicros(Number(value))} · ${(payload?.tokens ?? 0).toLocaleString('zh-CN')} tok`,
                          '成本',
                        ]
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
