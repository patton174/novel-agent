import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import type { UsageModelTrends } from '@/api/billingApi'
import { formatTokenCount } from '@/api/billingApi'
import { PixelLineChart } from '@/components/pixel/charts/PixelLineChart'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function modelChartKey(index: number): string {
  return `m${index}`
}

export function formatUsageModelLabel(model: string): string {
  const trimmed = model.trim()
  if (!trimmed || trimmed === 'unknown') {
    return i18n.t('dashboard:usage.unknownModel')
  }
  const slash = trimmed.lastIndexOf('/')
  if (slash >= 0 && slash < trimmed.length - 1) {
    return trimmed.slice(slash + 1)
  }
  return trimmed.length > 28 ? `${trimmed.slice(0, 26)}…` : trimmed
}

function formatChartDate(value: string, locale: string): string {
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString(locale, { month: 'numeric', day: 'numeric', timeZone: 'UTC' })
}

export interface UsageModelTrendChartProps {
  trends: UsageModelTrends | null
  loading?: boolean
  className?: string
  /** 外层已有标题时，仅渲染图表/空态 */
  plain?: boolean
}

/** 多模型 Token 占比趋势（同图多色折线）。 */
export function UsageModelTrendChart({ trends, loading, className, plain = false }: UsageModelTrendChartProps) {
  const { t } = useTranslation(['dashboard'])
  const dateLocale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'

  const { chartData, series } = useMemo(() => {
    const models = trends?.models ?? []
    const points = trends?.points ?? []
    const rows = points.map((point) => {
      const row: Record<string, string | number> = { date: point.date }
      models.forEach((model, index) => {
        row[modelChartKey(index)] = point.tokensByModel?.[model] ?? 0
      })
      return row
    })
    const chartSeries = models.map((model, index) => ({
      key: modelChartKey(index),
      name: formatUsageModelLabel(model),
      fill: false as const,
    }))
    return { chartData: rows, series: chartSeries }
  }, [trends])

  const hasData = chartData.some((row) =>
    series.some((s) => Number(row[s.key] ?? 0) > 0),
  )

  if (loading) {
    return <Skeleton className={cn('h-[280px] w-full rounded-xl', className)} />
  }

  if (!series.length || !hasData) {
    return (
      <div
        className={cn(
          'flex h-[280px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground',
          className,
        )}
      >
        {t('dashboard:usage.modelTrendEmpty')}
      </div>
    )
  }

  return (
    <div className={cn(!plain && 'rounded-xl border-2 border-black bg-surface p-4 shadow-soft', className)}>
      <PixelLineChart
        data={chartData}
        xKey="date"
        series={series}
        heightClassName="h-[260px]"
        showLegend
        formatX={(value) => formatChartDate(value, dateLocale)}
        formatY={(value) => formatTokenCount(value)}
        formatTooltipValue={(value, key) => {
          const item = series.find((s) => s.key === key)
          return [formatTokenCount(value), item?.name ?? String(key)]
        }}
      />
    </div>
  )
}
