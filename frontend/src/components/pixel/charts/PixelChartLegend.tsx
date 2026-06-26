import type { PixelLineSeries } from './PixelLineChart'
import { pixelChartSeriesColor } from './pixelChartTheme'

export interface PixelChartLegendItem {
  key: string
  name: string
  color: string
  dashed?: boolean
}

export function PixelChartLegend({ items }: { items: PixelChartLegendItem[] }) {
  if (!items.length) return null
  return (
    <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-1 text-xs">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5">
          <svg width="18" height="10" aria-hidden className="shrink-0">
            <line
              x1="0"
              y1="5"
              x2="18"
              y2="5"
              stroke={item.color}
              strokeWidth="2"
              strokeDasharray={item.dashed ? '5 4' : undefined}
            />
            {!item.dashed ? <circle cx="9" cy="5" r="2.5" fill={item.color} /> : null}
          </svg>
          <span style={{ color: item.color }}>{item.name}</span>
        </li>
      ))}
    </ul>
  )
}

export function resolvePixelChartSeries(series: PixelLineSeries[]): Array<
  PixelLineSeries & { color: string; fill: boolean }
> {
  return series.map((s, index) => {
    const color = pixelChartSeriesColor(index, s.color)
    const fill = s.fill ?? (series.length === 1 && !s.dashed)
    return { ...s, color, fill: fill && !s.dashed }
  })
}
