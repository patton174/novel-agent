import { useId } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface ProAreaChartProps {
  data: Array<Record<string, string | number>>
  xKey: string
  valueKey: string
  height?: number
  emptyText?: string
  formatValue?: (v: number) => string
}

export function ProAreaChart({ data, xKey, valueKey, height = 220, emptyText = '暂无数据', formatValue }: ProAreaChartProps) {
  const fillId = `proAreaFill-${useId()}`
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        {emptyText}
      </div>
    )
  }
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
          <YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} tickFormatter={(v) => (formatValue ? formatValue(Number(v)) : String(v))} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 12 }}
            formatter={(v) => (formatValue ? formatValue(Number(v)) : String(v))}
          />
          <Area type="monotone" dataKey={valueKey} stroke="var(--color-primary)" strokeWidth={2} fill={`url(#${fillId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
