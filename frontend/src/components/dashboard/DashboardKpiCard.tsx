import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** 参考 DeepSeek 仪表盘：大号数值 + 下方标签，无图标 */
export function DashboardKpiCard({
  label,
  value,
  loading,
  className,
}: {
  label: string
  value: string
  loading?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/70 bg-surface px-6 py-5 shadow-soft',
        className,
      )}
    >
      {loading ? (
        <>
          <Skeleton className="h-9 w-28" />
          <Skeleton className="mt-3 h-4 w-20" />
        </>
      ) : (
        <>
          <p className="text-[1.75rem] font-bold tabular-nums leading-none tracking-tight text-foreground md:text-[2rem]">
            {value}
          </p>
          <p className="mt-2.5 text-sm text-muted-foreground">{label}</p>
        </>
      )}
    </div>
  )
}
