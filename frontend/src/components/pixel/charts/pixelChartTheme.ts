/** 管理台趋势图配色 — 高饱和线条 + 渐变面积 */
export const pixelChartNeon = {
  purple: '#a855f7',
  blue: '#3b82f6',
  green: '#22c55e',
  lime: '#99ff00',
  orange: '#fb923c',
  cyan: '#06b6d4',
  red: '#ef4444',
} as const

export const pixelChartSeriesColors = [
  pixelChartNeon.purple,
  pixelChartNeon.blue,
  pixelChartNeon.green,
  pixelChartNeon.cyan,
  pixelChartNeon.orange,
  pixelChartNeon.red,
] as const

export function pixelChartSeriesColor(index: number, override?: string): string {
  return override ?? pixelChartSeriesColors[index % pixelChartSeriesColors.length]
}

export const pixelChartAxisProps = {
  tickLine: false as const,
  axisLine: false as const,
  tick: {
    fontSize: 11,
    fill: 'var(--pixel-chart-axis)',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  },
}

/** 水平虚线网格 */
export const pixelChartGridProps = {
  strokeDasharray: '3 7',
  stroke: 'var(--pixel-chart-grid-color)',
  vertical: false,
}

export const pixelChartTooltipStyle = {
  borderRadius: 6,
  border: '1px solid var(--pixel-border-strong)',
  background: 'var(--popover)',
  color: 'var(--popover-foreground)',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  fontSize: 12,
  boxShadow: 'var(--pixel-tooltip-shadow)',
}

export const pixelChartLineProps = {
  type: 'monotone' as const,
  strokeWidth: 2,
  dot: false as const,
  activeDot: {
    r: 4,
    strokeWidth: 2,
    stroke: 'var(--background)',
  },
}

export const pixelChartFillGradientStops = {
  top: 'var(--pixel-chart-fill-top)',
  bottom: 0,
} as const

export const pixelChartPalette = pixelChartSeriesColors

/** @deprecated 使用 pixelChartAxisProps */
export const pixelChartDarkAxisProps = pixelChartAxisProps
/** @deprecated 使用 pixelChartGridProps */
export const pixelChartDarkGridProps = pixelChartGridProps
/** @deprecated 使用 pixelChartTooltipStyle */
export const pixelChartDarkTooltipStyle = pixelChartTooltipStyle

export function formatPixelChartDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

export function formatPixelChartCompactNumber(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) {
    const n = value / 1_000_000
    return `${Number.isInteger(n) ? n : n.toFixed(1)}M`
  }
  if (abs >= 1_000) {
    const n = value / 1_000
    return `${Number.isInteger(n) ? n : n.toFixed(1)}k`
  }
  return String(value)
}
