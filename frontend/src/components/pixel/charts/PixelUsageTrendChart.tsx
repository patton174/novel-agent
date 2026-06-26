import type { PlatformUsageTrendPoint } from '@/api/billingAdminApi'
import { PIXEL_CHART_HEIGHT } from '../pixelTokens'
import { PixelLineChart, type PixelLineChartProps } from './PixelLineChart'
import { pixelChartNeon } from './pixelChartTheme'

export function mapUsageTrendPoints(points: PlatformUsageTrendPoint[]) {
  return points.map((p) => ({
    date: p.date,
    tokens: p.tokens,
    cost: Math.round(p.costMicros / 10_000) / 100,
  }))
}

type MappedUsageTrendPoint = ReturnType<typeof mapUsageTrendPoints>[number]

export interface PixelUsageTrendChartProps
  extends Omit<
    PixelLineChartProps<MappedUsageTrendPoint>,
    'data' | 'xKey' | 'series' | 'showLegend'
  > {
  data: PlatformUsageTrendPoint[]
  tokensLabel?: string
  costLabel?: string
}

/** Token 面积 + 费用虚线（双 Y 轴），对齐参考「使用趋势」样式 */
export function PixelUsageTrendChart({
  data,
  tokensLabel = 'Tokens',
  costLabel = '费用',
  heightClassName = PIXEL_CHART_HEIGHT,
  formatY = (v) => v.toLocaleString('zh-CN'),
  formatYRight = (v) => `¥${v.toFixed(2)}`,
  ...props
}: PixelUsageTrendChartProps) {
  const mapped = mapUsageTrendPoints(data)
  return (
    <PixelLineChart
      {...props}
      data={mapped}
      xKey="date"
      heightClassName={heightClassName}
      formatY={formatY}
      formatYRight={formatYRight}
      showLegend
      series={[
        {
          key: 'tokens',
          name: tokensLabel,
          color: pixelChartNeon.purple,
          fill: true,
        },
        {
          key: 'cost',
          name: costLabel,
          color: pixelChartNeon.red,
          dashed: true,
          yAxisId: 'right',
          fill: false,
        },
      ]}
    />
  )
}

export type { MappedUsageTrendPoint }
