import { cn } from '@/lib/utils'
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react'

export interface ProChartKpiTrend {
  delta: number
  direction: 'up' | 'down' | 'flat'
}

export interface ProChartKpiProps {
  label: string
  value: string
  trend?: ProChartKpiTrend
  loading?: boolean
  className?: string
}

export function ProChartKpi({ label, value, trend, loading, className }: ProChartKpiProps) {
  if (loading) {
    return (
      <div className={cn('rounded-2xl border border-border/70 bg-surface px-6 py-5 shadow-soft', className)}>
        <div className="animate-pulse h-9 w-28 rounded bg-muted" />
        <div className="animate-pulse mt-3 h-4 w-20 rounded bg-muted" />
      </div>
    )
  }
  const trendColor =
    trend?.direction === 'up' ? 'text-success' : trend?.direction === 'down' ? 'text-destructive' : 'text-muted-foreground'
  const TrendIcon = trend?.direction === 'down' ? IconTrendingDown : IconTrendingUp
  return (
    <div className={cn('rounded-2xl border border-border/70 bg-surface px-6 py-5 shadow-soft', className)}>
      <p className="text-[1.75rem] font-bold tabular-nums leading-none tracking-tight text-foreground md:text-[2rem]">{value}</p>
      <div className="mt-2.5 flex items-center gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {trend ? (
          <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium tabular-nums', trendColor)}>
            <TrendIcon size={14} stroke={2} />
            {trend.delta > 0 ? '+' : ''}{trend.delta}%
          </span>
        ) : null}
      </div>
    </div>
  )
}
