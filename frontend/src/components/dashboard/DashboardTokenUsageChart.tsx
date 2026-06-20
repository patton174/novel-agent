import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { UsageTrendPoint } from '@/api/billingApi'
import { formatTokenCount } from '@/api/billingApi'
import { Skeleton } from '@/components/ui/skeleton'
import { formatChartAxisMetric } from '@/utils/dashboardMetrics'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'

function formatChartDate(value: string, locale: string): string {
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString(locale, { month: 'numeric', day: 'numeric', timeZone: 'UTC' })
}

interface DashboardTokenUsageChartProps {
  points: UsageTrendPoint[]
  loading?: boolean
}

export function DashboardTokenUsageChart({ points, loading }: DashboardTokenUsageChartProps) {
  const { t } = useTranslation(['dashboard'])
  const dateLocale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'

  const series = useMemo(
    () => points.map((p) => ({ date: p.date, tokens: p.tokens })),
    [points],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('dashboard:home.tokenTitle')}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('dashboard:home.tokenDesc')}
          </p>
        </div>
      </div>

      <div className="relative flex-1 px-4 pb-4 pt-3 sm:px-6">
        {loading ? (
          <Skeleton className="h-[220px] w-full rounded-xl md:h-[260px]" />
        ) : series.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground md:h-[260px]">
            {t('dashboard:home.tokenEmpty')}
          </div>
        ) : (
          <div className="h-[220px] w-full md:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashboardTokenFill" x1="0" y1="0" x2="0" y2="1">
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
                  width={48}
                  tickFormatter={(v) => formatChartAxisMetric(Number(v), dateLocale)}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '0.75rem',
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--surface))',
                    fontSize: '12px',
                  }}
                  labelFormatter={(label) => formatChartDate(String(label), dateLocale)}
                  formatter={(value) => [
                    formatTokenCount(Number(value)),
                    t('dashboard:home.tokenTooltip'),
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#dashboardTokenFill)"
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
