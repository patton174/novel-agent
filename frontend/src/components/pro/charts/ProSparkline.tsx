import { Area, AreaChart, ResponsiveContainer } from 'recharts'

export interface ProSparklineProps {
  data: Array<Record<string, number>>
  valueKey: string
  height?: number
  color?: string
}

export function ProSparkline({ data, valueKey, height = 32, color = 'var(--color-primary)' }: ProSparklineProps) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id="proSparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={valueKey} stroke={color} strokeWidth={1.5} fill="url(#proSparkFill)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
