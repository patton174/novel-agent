import type { PlatformUsageTrendPoint } from '@/api/billingAdminApi'
import { useTranslation } from 'react-i18next'
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
  tokensLabel,
  costLabel,
  heightClassName = PIXEL_CHART_HEIGHT,
  formatY,
  formatYRight,
  ...props
}: PixelUsageTrendChartProps) {
  const { t, i18n } = useTranslation('common')
  const resolvedTokensLabel = tokensLabel ?? t('chart.tokens')
  const resolvedCostLabel = costLabel ?? t('chart.cost')
  const mapped = mapUsageTrendPoints(data)
  return (
    <PixelLineChart
      {...props}
      data={mapped}
      xKey="date"
      heightClassName={heightClassName}
      formatY={formatY ?? ((v) => v.toLocaleString(i18n.language))}
      formatYRight={formatYRight ?? ((v) => `¥${v.toFixed(2)}`)}
      showLegend
      series={[
        {
          key: 'tokens',
          name: resolvedTokensLabel,
          color: pixelChartNeon.purple,
          fill: true,
        },
        {
          key: 'cost',
          name: resolvedCostLabel,
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
