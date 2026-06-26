import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils'
import { PIXEL_CHART_EMPTY, PIXEL_CHART_HEIGHT, PIXEL_CHART_PLOT } from '../pixelTokens'
import {
  pixelChartAxisProps,
  pixelChartFillGradientStops,
  pixelChartGridProps,
  pixelChartLineProps,
  pixelChartNeon,
  pixelChartTooltipStyle,
} from './pixelChartTheme'

export interface PixelAreaChartProps {
  data: Array<Record<string, string | number>>
  xKey: string
  valueKey: string
  heightClassName?: string
  emptyText?: string
  formatValue?: (v: number) => string
  stroke?: string
  className?: string
}

export function PixelAreaChart({
  data,
  xKey,
  valueKey,
  heightClassName = PIXEL_CHART_HEIGHT,
  emptyText = '暂无数据',
  formatValue,
  stroke = pixelChartNeon.blue,
  className,
}: PixelAreaChartProps) {
  const fillId = `pixelAreaFill-${useId().replace(/:/g, '')}`
  if (!data.length) {
    return <div className={cn(PIXEL_CHART_EMPTY, heightClassName, className)}>{emptyText}</div>
  }
  return (
    <div className={cn(PIXEL_CHART_PLOT, className)}>
      <div className={cn(heightClassName, 'w-full')}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={Number(pixelChartFillGradientStops.top)} />
                <stop offset="100%" stopColor={stroke} stopOpacity={pixelChartFillGradientStops.bottom} />
              </linearGradient>
            </defs>
            <CartesianGrid {...pixelChartGridProps} />
            <XAxis dataKey={xKey} {...pixelChartAxisProps} dy={4} />
            <YAxis
              {...pixelChartAxisProps}
              width={40}
              tickFormatter={(v) => (formatValue ? formatValue(Number(v)) : String(v))}
            />
            <Tooltip
              contentStyle={pixelChartTooltipStyle}
              labelStyle={{ color: 'var(--foreground)' }}
              formatter={(v) => (formatValue ? formatValue(Number(v)) : String(v))}
            />
            <Area
              type={pixelChartLineProps.type}
              dataKey={valueKey}
              stroke={stroke}
              strokeWidth={pixelChartLineProps.strokeWidth}
              fill={`url(#${fillId})`}
              dot={false}
              activeDot={{ ...pixelChartLineProps.activeDot, fill: stroke }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
