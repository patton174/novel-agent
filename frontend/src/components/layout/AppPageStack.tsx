import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** 应用内页标准垂直间距；外层宽度由 AppShellMain max-w-6xl 统一 */
export function AppPageStack({
  children,
  className,
  /** 账单、设置等表单窄页（在 6xl 壳内居中 3xl） */
  compact,
}: {
  children: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex w-full flex-col gap-6',
        compact && 'mx-auto max-w-3xl',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Dashboard / Admin 统一卡片壳 */
export function AppShellCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-soft',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function AppShellCardHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-border/60 px-6 py-5 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

export function AppShellCardBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>
}

/** 页面顶部的轻量介绍条 */
export function AppPageIntro({
  eyebrow,
  title,
  icon: Icon,
  action,
}: {
  eyebrow: string
  title: ReactNode
  icon: React.ComponentType<{ className?: string }>
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/70 bg-gradient-to-br from-primary/[0.04] via-surface to-violet-500/[0.05] px-5 py-4 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
          <div className="text-lg font-bold text-foreground">{title}</div>
        </div>
      </div>
      {action}
    </div>
  )
}

/** 统计图表统一高度与空态 */
export const APP_CHART_HEIGHT = 'h-60 w-full md:h-72'
export const APP_CHART_EMPTY =
  'flex h-60 items-center justify-center text-sm text-muted-foreground md:h-72'

/** Dashboard / Admin 趋势图卡片 */
export function AppChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <AppShellCard className={className}>
      <AppShellCardHeader title={title} description={description} />
      <AppShellCardBody className="py-4">{children}</AppShellCardBody>
    </AppShellCard>
  )
}

/** 列表 / 网格空态 */
export function AppEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <AppShellCard className={className}>
      <AppShellCardBody className="flex flex-col items-center justify-center py-14 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
          <Icon className="size-7 opacity-70" />
        </div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
        {action ? <div className="mt-6">{action}</div> : null}
      </AppShellCardBody>
    </AppShellCard>
  )
}

/** KPI 指标卡（Dashboard / Admin 概览） */
export function AppStatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  iconBgClassName = 'bg-primary/10',
  loading,
}: {
  label: string
  value: ReactNode
  icon: React.ComponentType<{ className?: string }>
  iconClassName?: string
  iconBgClassName?: string
  loading?: boolean
}) {
  return (
    <AppShellCard>
      <AppShellCardBody className="flex items-center gap-2.5 py-3 sm:gap-3 sm:py-4">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-10',
            iconBgClassName,
          )}
        >
          <Icon className={cn('size-4 sm:size-4.5', iconClassName ?? 'text-primary')} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums leading-none text-foreground sm:mt-1 sm:text-2xl">
            {loading ? <Skeleton className="h-6 w-14 sm:h-7" /> : value}
          </p>
        </div>
      </AppShellCardBody>
    </AppShellCard>
  )
}
