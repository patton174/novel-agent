import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import type { UsageTrendPoint } from '@/api/billingApi'
import { formatCostMicros } from '@/api/billingApi'
import { PixelLineChart } from '@/components/pixel/charts/PixelLineChart'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function formatChartDate(value: string, locale: string): string {
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString(locale, { month: 'numeric', day: 'numeric', timeZone: 'UTC' })
}

function microsToYuan(micros: number): number {
  return Math.round(micros / 10_000) / 100
}

export interface BillingCostTrendChartProps {
  points: UsageTrendPoint[]
  loading?: boolean
  className?: string
}

/** 最近费用趋势（折线，近 30 天）。 */
export function BillingCostTrendChart({ points, loading, className }: BillingCostTrendChartProps) {
  const { t } = useTranslation(['dashboard'])
  const dateLocale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'

  const chartData = useMemo(
    () => points.map((p) => ({ date: p.date, cost: microsToYuan(p.costMicros) })),
    [points],
  )

  const hasData = chartData.some((p) => p.cost > 0)

  if (loading) {
    return <Skeleton className={cn('h-[200px] w-full', className)} />
  }

  if (!hasData) {
    return (
      <div
        className={cn(
          'flex h-[200px] items-center justify-center text-sm text-muted-foreground',
          className,
        )}
      >
        {t('dashboard:billing.costTrendEmpty')}
      </div>
    )
  }

  return (
    <div className={cn('pt-2', className)}>
      <p className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-primary">
        {t('dashboard:billing.costTrendTitle')}
      </p>
      <PixelLineChart
        data={chartData}
        xKey="date"
        series={[{ key: 'cost', name: t('dashboard:billing.estCost'), fill: true }]}
        heightClassName="h-[200px]"
        formatX={(value) => formatChartDate(value, dateLocale)}
        formatY={(value) => formatCostMicros(Math.round(value * 10_000))}
        formatTooltipValue={(value) => [
          formatCostMicros(Math.round(value * 10_000)),
          t('dashboard:billing.estCost'),
        ]}
        showLegend={false}
      />
    </div>
  )
}
