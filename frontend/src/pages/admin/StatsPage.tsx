import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchStatsTrends, type TrendPoint } from '@/api/adminApi'
import { appToast } from '@/stores/appToastStore'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function formatChartDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export default function StatsPage() {
  const [agentRunTrend, setAgentRunTrend] = useState<TrendPoint[] | null>(null)
  const [registrationTrend, setRegistrationTrend] = useState<TrendPoint[] | null>(null)

  useEffect(() => {
    let cancelled = false

    void fetchStatsTrends(30)
      .then((data) => {
        if (cancelled) {
          return
        }
        setAgentRunTrend(data.agentRunTrend)
        setRegistrationTrend(data.registrationTrend)
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return
        }
        setAgentRunTrend([])
        setRegistrationTrend([])
        appToast.error(err instanceof Error ? err.message : '加载趋势数据失败')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const loading = agentRunTrend === null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agent 调用趋势</CardTitle>
          <CardDescription>近 30 日 Agent 运行次数</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[240px] w-full md:h-[360px]" />
          ) : agentRunTrend!.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground md:h-[360px]">
              暂无趋势数据
            </div>
          ) : (
            <div className="h-[240px] w-full md:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={agentRunTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    labelFormatter={(label) => formatChartDate(String(label))}
                    formatter={(value) => [Number(value).toLocaleString('zh-CN'), '调用次数']}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-primary, #e9b50b)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {registrationTrend !== null && registrationTrend.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>注册趋势</CardTitle>
            <CardDescription>近 30 日新用户注册</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] w-full md:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={registrationTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    labelFormatter={(label) => formatChartDate(String(label))}
                    formatter={(value) => [Number(value).toLocaleString('zh-CN'), '注册数']}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-primary, #e9b50b)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
