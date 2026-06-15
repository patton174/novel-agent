import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardActivityDay } from '@/api/dashboardApi'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  buildTrendSeries,
  formatCompactMetric,
  type DashboardTrendRange,
} from '@/utils/dashboardMetrics'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'

function formatChartDate(value: string, locale: string): string {
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString(locale, { month: 'numeric', day: 'numeric', timeZone: 'UTC' })
}

interface DashboardActivityTrendChartProps {
  days: DashboardActivityDay[]
  loading?: boolean
}

export function DashboardActivityTrendChart({
  days,
  loading,
}: DashboardActivityTrendChartProps) {
  const { t } = useTranslation(['dashboard'])
  const [range, setRange] = useState<DashboardTrendRange>(30)
  const dateLocale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'

  const series = useMemo(() => buildTrendSeries(days, range), [days, range])
  const peak = useMemo(
    () => (series.length ? Math.max(...series.map((p) => p.value)) : 0),
    [series],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-6 py-4">
        <h2 className="text-base font-semibold text-foreground">
          {t('dashboard:home.trendTitle')}
        </h2>
        <div className="flex shrink-0 rounded-lg bg-muted p-0.5">
          {([30, 7] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                range === option
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option === 30
                ? t('dashboard:home.trendRange30')
                : t('dashboard:home.trendRange7')}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex-1 px-4 pb-4 pt-3 sm:px-6">
        {loading ? (
          <Skeleton className="h-[220px] w-full rounded-xl md:h-[260px]" />
        ) : series.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground md:h-[260px]">
            {t('dashboard:heatmap.noData')}
          </div>
        ) : (
          <>
            {peak > 0 ? (
              <p className="pointer-events-none absolute right-6 top-3 text-xs tabular-nums text-muted-foreground">
                {formatCompactMetric(peak, dateLocale)}
              </p>
            ) : null}
            <div className="h-[220px] w-full md:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashboardTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => formatChartDate(String(v), dateLocale)}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    tickFormatter={(v) => formatCompactMetric(Number(v), dateLocale)}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '0.75rem',
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--surface))',
                      fontSize: '12px',
                    }}
                    labelFormatter={(label) => formatChartDate(String(label), dateLocale)}
                    formatter={(value, _name, item) => {
                      const payload = item?.payload as { writingWords?: number; agentRuns?: number }
                      const words = payload?.writingWords?.toLocaleString(dateLocale) ?? '0'
                      return [
                        `${formatCompactMetric(Number(value), dateLocale)} · ${words}`,
                        t('dashboard:home.trendTooltip'),
                      ]
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#dashboardTrendFill)"
                    dot={false}
                    activeDot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
