import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts'
import { cn } from '@/lib/utils'
import { PIXEL_CHART_EMPTY, PIXEL_CHART_HEIGHT, PIXEL_CHART_PLOT } from '../pixelTokens'
import { PixelChartLegend, resolvePixelChartSeries } from './PixelChartLegend'
import {
  formatPixelChartCompactNumber,
  pixelChartAxisProps,
  pixelChartFillGradientStops,
  pixelChartGridProps,
  pixelChartLineProps,
  pixelChartTooltipStyle,
} from './pixelChartTheme'

export interface PixelLineSeries {
  key: string
  name?: string
  color?: string
  strokeWidth?: number
  /** 渐变面积（默认：单系列且非虚线时为 true） */
  fill?: boolean
  dashed?: boolean
  yAxisId?: 'left' | 'right'
}

export interface PixelLineChartProps<T extends object> {
  data: T[]
  xKey: keyof T & string
  series: PixelLineSeries[]
  heightClassName?: string
  emptyText?: string
  formatX?: (value: string) => string
  formatY?: (value: number) => string
  formatYRight?: (value: number) => string
  formatTooltipValue?: (value: number, key: string) => [string, string]
  yWidth?: number
  yRightWidth?: number
  showLegend?: boolean
  compactY?: boolean
  className?: string
}

export function PixelLineChart<T extends object>({
  data,
  xKey,
  series,
  heightClassName = PIXEL_CHART_HEIGHT,
  emptyText,
  formatX,
  formatY,
  formatYRight,
  formatTooltipValue,
  yWidth = 40,
  yRightWidth = 40,
  showLegend,
  compactY = true,
  className,
}: PixelLineChartProps<T>) {
  const { t, i18n } = useTranslation('common')
  const resolvedEmptyText = emptyText ?? t('table.empty')
  const gradientId = useId().replace(/:/g, '')
  const resolved = useMemo(() => resolvePixelChartSeries(series), [series])
  const hasRightAxis = resolved.some((s) => s.yAxisId === 'right')
  const legendVisible = showLegend ?? resolved.length > 1

  const defaultFormatY = (value: number) =>
    compactY ? formatPixelChartCompactNumber(value) : value.toLocaleString(i18n.language)

  if (!data.length) {
    return <div className={cn(PIXEL_CHART_EMPTY, heightClassName, className)}>{resolvedEmptyText}</div>
  }

  const tooltipFormatter: TooltipProps<number, string>['formatter'] = (value, name) => {
    const num = Number(value)
    const key = String(name)
    if (formatTooltipValue) return formatTooltipValue(num, key)
    const seriesItem = resolved.find((s) => (s.name ?? s.key) === key || s.key === key)
    const label =
      seriesItem?.yAxisId === 'right' && formatYRight
        ? formatYRight(num)
        : formatY
          ? formatY(num)
          : defaultFormatY(num)
    return [label, seriesItem?.name ?? key]
  }

  return (
    <div className={cn(PIXEL_CHART_PLOT, className)}>
      <div className={cn(heightClassName, 'w-full')}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: hasRightAxis ? yRightWidth + 2 : 8, left: 0, bottom: 0 }}
          >
            <defs>
              {resolved
                .filter((s) => s.fill)
                .map((s) => (
                  <linearGradient key={s.key} id={`${gradientId}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={pixelChartFillGradientStops.top} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={pixelChartFillGradientStops.bottom} />
                  </linearGradient>
                ))}
            </defs>
            <CartesianGrid {...pixelChartGridProps} />
            <XAxis
              dataKey={xKey}
              {...pixelChartAxisProps}
              tickFormatter={formatX ? (v) => formatX(String(v)) : undefined}
              dy={4}
            />
            <YAxis
              yAxisId="left"
              {...pixelChartAxisProps}
              width={yWidth}
              tickFormatter={(v) => (formatY ? formatY(Number(v)) : defaultFormatY(Number(v)))}
            />
            {hasRightAxis ? (
              <YAxis
                yAxisId="right"
                orientation="right"
                {...pixelChartAxisProps}
                width={yRightWidth}
                tickFormatter={(v) =>
                  formatYRight ? formatYRight(Number(v)) : defaultFormatY(Number(v))
                }
              />
            ) : null}
            <Tooltip
              contentStyle={pixelChartTooltipStyle}
              labelStyle={{ color: 'var(--foreground)' }}
              itemStyle={{ color: 'var(--popover-foreground)' }}
              labelFormatter={(label) => (formatX ? formatX(String(label)) : String(label))}
              formatter={tooltipFormatter}
            />
            {resolved.map((s) => {
              const yAxis = s.yAxisId ?? 'left'
              const activeDot = {
                ...pixelChartLineProps.activeDot,
                fill: s.color,
              }
              if (s.fill) {
                return (
                  <Area
                    key={s.key}
                    yAxisId={yAxis}
                    type={pixelChartLineProps.type}
                    dataKey={s.key}
                    name={s.name ?? s.key}
                    stroke={s.color}
                    strokeWidth={s.strokeWidth ?? pixelChartLineProps.strokeWidth}
                    fill={`url(#${gradientId}-${s.key})`}
                    dot={false}
                    activeDot={activeDot}
                  />
                )
              }
              return (
                <Line
                  key={s.key}
                  yAxisId={yAxis}
                  type={pixelChartLineProps.type}
                  dataKey={s.key}
                  name={s.name ?? s.key}
                  stroke={s.color}
                  strokeWidth={s.strokeWidth ?? (s.dashed ? 1.75 : pixelChartLineProps.strokeWidth)}
                  strokeDasharray={s.dashed ? '6 5' : undefined}
                  dot={pixelChartLineProps.dot}
                  activeDot={activeDot}
                />
              )
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {legendVisible ? (
        <PixelChartLegend
          items={resolved.map((s) => ({
            key: s.key,
            name: s.name ?? s.key,
            color: s.color,
            dashed: s.dashed,
          }))}
        />
      ) : null}
    </div>
  )
}
